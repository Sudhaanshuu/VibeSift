#!/usr/bin/env python3
"""
VibeSift Website Inspection Worker (Python)
Integrates:
- BasicAuditor (34 website completeness, trust, SEO, and performance health checks)
- DeepAuditor (22 distinct deep security checks: XSS, SQLi, CSRF, CSP, Framing, Open Redirects,
               Traversal, SSRF, Auth, Cookies, CORS, Info Leaks, Sensitive Files, Rate Limits, etc.)
- PrivacyAuditor (15 Indian DPDP Act 2023 & consent compliance checks)

Enforces strict SSRF validation on every request, redirect, and domain resolution.
"""

import argparse
import json
import logging
import os
import sys
import time
import urllib.parse
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import requests

from basic_auditor import BasicAuditor
from deep_auditor import DeepAuditor
from privacy_auditor import PrivacyAuditor
from ssrf_guard import SSRFProtectionError, resolve_and_validate_host, validate_url

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("WebsiteInspector")


class SafeSession(requests.Session):
    """Requests Session enforcing SSRF validation on every request and redirect."""
    def __init__(self, max_response_size: int = 2 * 1024 * 1024):
        super().__init__()
        self.max_redirects = 5
        self.max_response_size = max_response_size
        self.headers.update({
            "User-Agent": "Mozilla/5.0 (compatible; VibeSiftAuditor/2.0; +https://vibesift.pixir.in/docs/bot)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        })

    def request(self, method, url, **kwargs):
        normalized_url, hostname, _ = validate_url(url)
        resolve_and_validate_host(hostname)
        kwargs["stream"] = True
        kwargs.pop("max_redirects", None)

        resp = super().request(method, normalized_url, **kwargs)

        content = bytearray()
        for chunk in resp.iter_content(chunk_size=8192):
            content.extend(chunk)
            if len(content) > self.max_response_size:
                logger.warning(f"Response size exceeded {self.max_response_size} bytes for {url}. Truncating.")
                break
        resp._content = bytes(content)

        if resp.history:
            for r in resp.history:
                dest_url = r.headers.get("Location", "")
                if dest_url:
                    full_dest = urllib.parse.urljoin(r.url, dest_url)
                    _, dest_host, _ = validate_url(full_dest)
                    resolve_and_validate_host(dest_host)

        return resp


class UnifiedInspector:
    def __init__(
        self,
        target_url: str,
        scan_id: str,
        profile: str = "baseline_public",
        max_pages: int = 5,
        timeout: float = 6.0,
        job_timeout: float = 45.0,
    ):
        self.raw_target_url = target_url
        self.scan_id = scan_id
        self.profile = profile
        self.max_pages = max_pages
        self.timeout = timeout
        self.job_timeout = job_timeout
        self.start_time = time.time()

        self.normalized_url, self.hostname, self.port = validate_url(target_url)
        self.session = SafeSession()

    def run(self) -> Dict[str, Any]:
        logger.info(f"Starting inspection for {self.normalized_url} (profile: {self.profile}, scanId: {self.scan_id})")

        # 1. Execute Basic Audit Suite (always run)
        basic_auditor = BasicAuditor(
            session=self.session,
            target_url=self.normalized_url,
            scan_id=self.scan_id,
            timeout=self.timeout,
            job_timeout=self.job_timeout,
        )
        basic_checks, basic_findings, tls_info = basic_auditor.run_suite()

        # Cache root response for subsequent suites (reuse already fetched response)
        root_resp = getattr(basic_auditor, "main_resp", None)

        all_checks = list(basic_checks)
        all_findings = list(basic_findings)
        privacy_summary = None
        deep_comparison = None

        if self.profile == "authorized_deep":
            # 2. Execute Deep Security Audit Suite
            deep_auditor = DeepAuditor(
                session=self.session,
                target_url=self.normalized_url,
                scan_id=self.scan_id,
                timeout=self.timeout,
                job_timeout=self.job_timeout,
            )
            deep_checks, deep_findings = deep_auditor.run_suite(root_resp)
            all_checks.extend(deep_checks)
            all_findings.extend(deep_findings)

            # 3. Execute Privacy & Indian DPDP Act 2023 Audit Suite
            privacy_auditor = PrivacyAuditor(
                session=self.session,
                target_url=self.normalized_url,
                scan_id=self.scan_id,
                timeout=self.timeout,
            )
            priv_checks, priv_findings, privacy_summary = privacy_auditor.run_suite(root_resp)
            all_checks.extend(priv_checks)
            all_findings.extend(priv_findings)

            # Calculate Deep vs Basic comparison metrics
            additional_test_names = [c["name"] for c in deep_checks]
            independent_count = sum(1 for c in deep_checks if c.get("isIndependent", True))
            reused_count = len(basic_checks)
            not_tested_count = sum(1 for c in deep_checks if c["status"] == "not_tested")
            confirmed_vulns = sum(1 for c in all_checks if c.get("findingType") == "confirmed" and c["status"] in ("fail", "warning"))
            potential_risks = sum(1 for c in all_checks if c.get("findingType") == "suspected" and c["status"] in ("fail", "warning"))

            deep_comparison = {
                "additionalChecksExecuted": len(deep_checks) + len(priv_checks),
                "independentTestsCount": independent_count,
                "reusedEvidenceCount": reused_count,
                "notTestedCount": not_tested_count,
                "confirmedVulnerabilitiesCount": confirmed_vulns,
                "potentialRisksCount": potential_risks,
                "additionalTestNames": additional_test_names,
                "skippedTestReasons": {
                    "D17_BRUTE_FORCE_DEFENSE": "Active credential brute-force testing omitted without explicit test credentials to prevent account lockout."
                },
            }
        else:
            # Baseline Public: Run passive privacy signals
            privacy_auditor = PrivacyAuditor(
                session=self.session,
                target_url=self.normalized_url,
                scan_id=self.scan_id,
                timeout=self.timeout,
            )
            priv_checks, priv_findings, privacy_summary = privacy_auditor.run_suite(root_resp)
            all_checks.extend(priv_checks)
            all_findings.extend(priv_findings)

        duration = time.time() - self.start_time
        logger.info(f"Inspection complete in {duration:.2f}s with {len(all_checks)} total checks and {len(all_findings)} findings.")

        passed_count = sum(1 for c in all_checks if c["status"] == "pass")
        failed_count = sum(1 for c in all_checks if c["status"] == "fail")
        warning_count = sum(1 for c in all_checks if c["status"] == "warning")
        info_count = sum(1 for c in all_checks if c["status"] == "info")
        not_tested_count = sum(1 for c in all_checks if c["status"] == "not_tested")
        unknown_count = sum(1 for c in all_checks if c["status"] == "unknown")
        not_applicable_count = sum(1 for c in all_checks if c["status"] == "not_applicable")

        return {
            "scanId": self.scan_id,
            "targetUrl": self.normalized_url,
            "hostname": self.hostname,
            "scanProfile": self.profile,
            "executionTimeMs": int(duration * 1000),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "tlsObservations": tls_info,
            "pagesAudited": len(basic_auditor.visited_urls),
            "checks": all_checks,
            "findings": all_findings,
            "checkCounts": {
                "total": len(all_checks),
                "passed": passed_count,
                "failed": failed_count,
                "warning": warning_count,
                "info": info_count,
                "notTested": not_tested_count,
                "unknown": unknown_count,
                "notApplicable": not_applicable_count,
            },
            "privacyCompliance": privacy_summary,
            "deepComparison": deep_comparison,
        }


def main():
    parser = argparse.ArgumentParser(description="VibeSift Safe Website Inspector")
    parser.add_argument("--url", required=True, help="Target URL to audit")
    parser.add_argument("--scan-id", required=True, help="Scan job ID")
    parser.add_argument("--output", required=True, help="Path to write JSON output report")
    parser.add_argument("--profile", default="baseline_public", choices=["baseline_public", "authorized_deep"], help="Audit scope profile")
    parser.add_argument("--max-pages", type=int, default=5, help="Maximum pages to crawl")
    parser.add_argument("--timeout", type=float, default=6.0, help="HTTP request timeout in seconds")
    parser.add_argument("--job-timeout", type=float, default=45.0, help="Total execution timeout")

    args = parser.parse_args()

    try:
        inspector = UnifiedInspector(
            target_url=args.url,
            scan_id=args.scan_id,
            profile=args.profile,
            max_pages=args.max_pages,
            timeout=args.timeout,
            job_timeout=args.job_timeout,
        )
        report = inspector.run()
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
        logger.info(f"Report written successfully to {args.output}")
        sys.exit(0)
    except SSRFProtectionError as e:
        logger.error(f"SSRF Protection triggered: {e}")
        error_report = {
            "scanId": args.scan_id,
            "targetUrl": args.url,
            "error": "SSRF_PROHIBITED",
            "message": str(e),
            "findings": [],
            "checks": [],
        }
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(error_report, f, indent=2)
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected fatal error during inspection: {e}", exc_info=True)
        sys.exit(2)


if __name__ == "__main__":
    main()
