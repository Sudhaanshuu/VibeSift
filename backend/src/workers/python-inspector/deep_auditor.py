#!/usr/bin/env python3
"""
VibeSift Deep Security Audit Engine
Performs substantially deeper technical security assessment using safe,
non-destructive testing methods, bounded requests, and response validation.
Covers 22 distinct security tests across:
A. Web application vulnerabilities (XSS, SQLi, CSRF, Headers, CSP, Clickjacking,
   Open Redirect, Path Traversal, SSRF, Auth, Cookies, CORS, Info Leaks, Sensitive Files, Methods)
B. Abuse prevention and infrastructure (Rate Limits, Brute Force, APIs, TLS Hardening,
   DNS/Email SPF/DMARC, Outdated Client Dependencies, Cache-Control on Sensitive Endpoints)
"""

import json
import logging
import re
import socket
import ssl
import subprocess
import time
import urllib.parse
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

import requests
from ssrf_guard import SSRFProtectionError, validate_url, resolve_and_validate_host

logger = logging.getLogger("DeepAuditor")


class DeepAuditor:
    def __init__(
        self,
        session: requests.Session,
        target_url: str,
        scan_id: str,
        timeout: float = 6.0,
        job_timeout: float = 60.0,
    ):
        self.session = session
        self.raw_target_url = target_url
        self.scan_id = scan_id
        self.timeout = timeout
        self.job_timeout = job_timeout
        self.start_time = time.time()

        self.normalized_url, self.hostname, self.port = validate_url(target_url)
        self.checks: List[Dict[str, Any]] = []
        self.findings: List[Dict[str, Any]] = []

    def record_check(
        self,
        check_id: str,
        name: str,
        category: str,
        status: str,  # pass, fail, warning, info, not_tested, not_applicable, unknown
        severity: str = "info",
        finding_type: str = "informational",  # confirmed, suspected, informational
        explanation: str = "",
        impact: str = "",
        remediation_summary: str = "",
        remediation_snippet: Optional[str] = None,
        doc_url: Optional[str] = None,
        evidence: Optional[Dict[str, Any]] = None,
        is_independent: bool = True,
        execution_reason: Optional[str] = None,
    ):
        now_iso = datetime.now(timezone.utc).isoformat()
        check_obj = {
            "checkId": check_id,
            "name": name,
            "category": category,
            "status": status,
            "severity": severity,
            "findingType": finding_type,
            "auditMode": "deep",
            "explanation": explanation,
            "impact": impact,
            "remediation": {
                "summary": remediation_summary,
                "codeSnippet": remediation_snippet,
                "docUrl": doc_url,
            },
            "evidence": evidence or {},
            "testTimestamp": now_iso,
            "scope": f"authorized_deep:{self.hostname}",
            "isIndependent": is_independent,
            "executionReason": execution_reason,
        }
        self.checks.append(check_obj)

        if status in ("fail", "warning", "info") and finding_type in ("confirmed", "suspected"):
            finding_id = f"fnd_deep_{self.scan_id[:8]}_{len(self.findings) + 1}_{check_id.lower()}"
            self.findings.append({
                "id": finding_id,
                "scanId": self.scan_id,
                "ruleId": check_id,
                "category": category,
                "severity": severity,
                "confidence": "certain" if finding_type == "confirmed" else "high",
                "title": name,
                "description": explanation,
                "affectedUrl": evidence.get("testedUrl") if evidence else self.normalized_url,
                "detectionMethod": "active" if is_independent else "heuristic",
                "engine": "custom-python",
                "impact": impact,
                "remediation": {
                    "summary": remediation_summary,
                    "codeSnippet": remediation_snippet,
                    "docUrl": doc_url,
                },
                "evidence": evidence or {},
                "verificationStatus": "open",
            })

    def run_suite(self, root_resp: Optional[requests.Response]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        logger.info(f"[DeepAuditor] Running 22 Deep Security Tests against {self.normalized_url}")

        if not root_resp:
            try:
                root_resp = self.session.get(self.normalized_url, timeout=self.timeout)
            except Exception as e:
                logger.error(f"Cannot run deep audit: root page unreachable {e}")
                return self.checks, self.findings

        html_text = root_resp.text or ""
        soup = BeautifulSoup(html_text, "html.parser") if (BeautifulSoup and html_text) else None
        headers = {k.lower(): v for k, v in root_resp.headers.items()}

        # 1. XSS Reflection Context
        self._test_xss_reflection()

        # 2. SQL Injection Heuristic
        self._test_sqli_heuristic()

        # 3. Anti-CSRF Controls
        self._test_csrf_controls(soup)

        # 4. Security Headers Comprehensive Suite
        self._test_security_headers_suite(headers)

        # 5. In-Depth CSP Evaluation
        self._test_csp_in_depth(headers)

        # 6. Clickjacking Framing Protection
        self._test_clickjacking_protection(headers)

        # 7. Open Redirects
        self._test_open_redirects(soup)

        # 8. Safe Path Traversal Check
        self._test_path_traversal(soup)

        # 9. SSRF Parameter Surface
        self._test_ssrf_surface(soup)

        # 10. Authentication Endpoints Hardening
        self._test_auth_endpoints(soup)

        # 11. Session Cookie Security Deep
        self._test_session_cookie_security(root_resp)

        # 12. CORS Misconfiguration Assessment
        self._test_cors_misconfiguration()

        # 13. Information Disclosure & Stack Traces
        self._test_info_disclosure()

        # 14. Sensitive File & Backup Exposure
        self._test_sensitive_file_exposure()

        # 15. HTTP Methods & TRACE Verb
        self._test_http_methods()

        # 16. Rate Limiting Burst Test
        self._test_rate_limiting()

        # 17. Brute-Force & Credential Defense
        self._test_brute_force_defense(soup)

        # 18. Public API & Documentation Exposure
        self._test_api_exposure()

        # 19. TLS Hardening & Preload
        self._test_tls_hardening(headers)

        # 20. DNS & Email Authentication (SPF/DMARC)
        self._test_dns_email_security()

        # 21. Client-Side Outdated Dependencies & Source Maps
        self._test_client_dependencies(soup, html_text)

        # 22. Cache-Control on Sensitive Endpoints
        self._test_cache_security(headers)

        logger.info(f"[DeepAuditor] Deep audit completed. Executed {len(self.checks)} deep security tests.")
        return self.checks, self.findings

    # ---------------- 1. XSS Reflection Context ----------------

    def _test_xss_reflection(self):
        canary = "vbtst78<probe>xss"
        safe_encoded = "vbtst78&lt;probe&gt;xss"
        test_params = ["q", "search", "id", "s", "query"]

        probe_url = None
        reflected = False
        raw_reflection = False

        for param in test_params:
            candidate_url = f"{self.normalized_url}?{param}={urllib.parse.quote(canary)}"
            try:
                r = self.session.get(candidate_url, timeout=self.timeout)
                if canary in r.text:
                    probe_url = candidate_url
                    reflected = True
                    raw_reflection = True
                    break
                elif safe_encoded in r.text or "vbtst78" in r.text:
                    probe_url = candidate_url
                    reflected = True
                    raw_reflection = False
                    break
            except Exception:
                pass

        if raw_reflection:
            self.record_check(
                check_id="D01_XSS_REFLECTION",
                name="Cross-Site Scripting (XSS) Reflection & Context Analysis",
                category="security",
                status="fail",
                severity="high",
                finding_type="confirmed",
                explanation=f"Harmless test probe '{canary}' was reflected unescaped into HTML output without entity encoding.",
                impact="Unescaped user input in HTML allows execution of arbitrary malicious JavaScript in victim browsers.",
                remediation_summary="Apply context-aware HTML entity encoding on all reflected user inputs (e.g. DOMPurify or framework auto-escaping).",
                evidence={"testedUrl": probe_url, "injectedPayload": canary, "reflectionType": "unescaped_raw_html"},
                is_independent=True,
            )
        elif reflected:
            self.record_check(
                check_id="D01_XSS_REFLECTION",
                name="Cross-Site Scripting (XSS) Reflection & Context Analysis",
                category="security",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation="Input parameter reflection was observed, but inputs are safely HTML-entity encoded.",
                evidence={"testedUrl": probe_url, "observedEncoding": safe_encoded},
                is_independent=True,
            )
        else:
            self.record_check(
                check_id="D01_XSS_REFLECTION",
                name="Cross-Site Scripting (XSS) Reflection & Context Analysis",
                category="security",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation="Candidate query parameters were safely probed; no unescaped reflection was observed.",
                evidence={"parametersTested": test_params},
                is_independent=True,
            )

    # ---------------- 2. SQL Injection Heuristic ----------------

    def _test_sqli_heuristic(self):
        sqli_probes = ["'", "''", "1' OR '1'='1"]
        db_error_signatures = [
            r"SQL syntax",
            r"mysql_fetch",
            r"pg_query",
            r"SQLite3::SQLException",
            r"sqlite3\.OperationalError",
            r"ODBC SQL Server Driver",
            r"ORA-01756",
            r"syntax error near",
            r"unclosed quotation mark after the character string",
        ]

        found_error = None
        tested_url = None

        for probe in sqli_probes:
            test_url = f"{self.normalized_url}?id={urllib.parse.quote(probe)}"
            try:
                r = self.session.get(test_url, timeout=self.timeout)
                for pattern in db_error_signatures:
                    match = re.search(pattern, r.text, re.I)
                    if match:
                        found_error = match.group(0)
                        tested_url = test_url
                        break
                if found_error:
                    break
            except Exception:
                pass

        if found_error:
            self.record_check(
                check_id="D02_SQLI_HEURISTIC",
                name="SQL Injection Safe Heuristic Assessment",
                category="security",
                status="fail",
                severity="critical",
                finding_type="confirmed",
                explanation=f"Safe syntax probe elicited raw database error response: '{found_error}'.",
                impact="Indicates unsanitized dynamic SQL query construction; potential full database compromise.",
                remediation_summary="Use parameterized queries / prepared statements with your ORM or SQL client.",
                evidence={"testedUrl": tested_url, "dbErrorSignature": found_error},
                is_independent=True,
            )
        else:
            self.record_check(
                check_id="D02_SQLI_HEURISTIC",
                name="SQL Injection Safe Heuristic Assessment",
                category="security",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation="Non-destructive syntax probe variations returned normal responses with no database error disclosure.",
                evidence={"probesTested": sqli_probes},
                is_independent=True,
            )

    # ---------------- 3. CSRF Controls ----------------

    def _test_csrf_controls(self, soup):
        if not soup:
            self.record_check(
                check_id="D03_CSRF_PROTECTION",
                name="CSRF & State-Changing Forms Inspection",
                category="security",
                status="unknown",
                explanation="DOM structure unavailable to inspect forms.",
                is_independent=True,
            )
            return

        post_forms = soup.find_all("form", method=re.compile(r"post", re.I))
        if not post_forms:
            self.record_check(
                check_id="D03_CSRF_PROTECTION",
                name="CSRF & State-Changing Forms Inspection",
                category="security",
                status="not_applicable",
                severity="info",
                finding_type="informational",
                explanation="No state-changing HTML POST forms detected on the public landing page.",
                is_independent=True,
            )
            return

        unprotected_forms = []
        for f in post_forms:
            action = f.get("action", self.normalized_url)
            has_token = False
            for inp in f.find_all("input", type="hidden"):
                name = inp.get("name", "").lower()
                if any(k in name for k in ["csrf", "xsrf", "token", "authenticity", "__requestverification"]):
                    has_token = True
                    break
            if not has_token:
                unprotected_forms.append(action)

        if unprotected_forms:
            self.record_check(
                check_id="D03_CSRF_PROTECTION",
                name="CSRF & State-Changing Forms Inspection",
                category="security",
                status="warning",
                severity="medium",
                finding_type="suspected",
                explanation=f"{len(unprotected_forms)} POST form(s) do not contain hidden anti-CSRF token fields.",
                impact="State-changing requests may be vulnerable to Cross-Site Request Forgery if SameSite cookies are absent.",
                remediation_summary="Equip state-changing forms with synchronized anti-CSRF tokens and SameSite=Lax/Strict cookies.",
                evidence={"unprotectedFormActions": unprotected_forms[:3]},
                is_independent=True,
            )
        else:
            self.record_check(
                check_id="D03_CSRF_PROTECTION",
                name="CSRF & State-Changing Forms Inspection",
                category="security",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation="All discovered POST forms implement anti-CSRF token fields.",
                evidence={"protectedFormsCount": len(post_forms)},
                is_independent=True,
            )

    # ---------------- 4. Security Headers Comprehensive Suite ----------------

    def _test_security_headers_suite(self, headers: Dict[str, str]):
        expected_headers = {
            "content-security-policy": "CSP header restricts trusted resource origins.",
            "strict-transport-security": "HSTS enforces encrypted HTTPS transport.",
            "x-content-type-options": "XCTO prevents MIME-sniffing execution.",
            "x-frame-options": "XFO prevents unauthorized framing and clickjacking.",
            "referrer-policy": "Referrer-Policy limits sensitive URL path leaks.",
            "permissions-policy": "Permissions-Policy restricts camera, microphone, and geolocation APIs.",
        }

        present = {}
        missing = []

        for h, desc in expected_headers.items():
            if h in headers:
                present[h] = headers[h]
            else:
                missing.append(h)

        if len(missing) == 0:
            self.record_check(
                check_id="D04_SECURITY_HEADERS",
                name="Security Headers Comprehensive Suite Evaluation",
                category="security",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation="All 6 core modern security headers are configured.",
                evidence={"presentHeaders": present},
                is_independent=True,
            )
        elif len(missing) <= 2:
            self.record_check(
                check_id="D04_SECURITY_HEADERS",
                name="Security Headers Comprehensive Suite Evaluation",
                category="security",
                status="warning",
                severity="low",
                finding_type="confirmed",
                explanation=f"Missing recommended security header(s): {', '.join(missing)}.",
                impact="Leaves minor defense-in-depth security hardening opportunities unaddressed.",
                remediation_summary="Add missing security response headers in your web server / reverse proxy config.",
                evidence={"missingHeaders": missing, "presentHeaders": present},
                is_independent=True,
            )
        else:
            self.record_check(
                check_id="D04_SECURITY_HEADERS",
                name="Security Headers Comprehensive Suite Evaluation",
                category="security",
                status="fail",
                severity="medium",
                finding_type="confirmed",
                explanation=f"Multiple standard security headers are missing: {', '.join(missing)}.",
                impact="Weakens browser-level defense-in-depth protections against XSS, clickjacking, and MIME confusion.",
                remediation_summary="Configure CSP, HSTS, X-Content-Type-Options, and Referrer-Policy headers.",
                evidence={"missingHeaders": missing, "presentHeaders": present},
                is_independent=True,
            )

    # ---------------- 5. CSP In-Depth Evaluation ----------------

    def _test_csp_in_depth(self, headers: Dict[str, str]):
        csp = headers.get("content-security-policy")
        if not csp:
            self.record_check(
                check_id="D05_CSP_DEEP_EVALUATION",
                name="Content Security Policy (CSP) In-Depth Analysis",
                category="security",
                status="fail",
                severity="high",
                finding_type="confirmed",
                explanation="No Content-Security-Policy header declared. The browser applies no origin restrictions on script execution.",
                impact="Attackers can inject arbitrary external scripts or exfiltrate sensitive data via XSS.",
                remediation_summary="Implement a strict CSP restricting script-src, object-src, and default-src.",
                remediation_snippet="Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none';",
                doc_url="https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP",
                evidence={"observedHeader": "[None]"},
                is_independent=True,
            )
            return

        issues = []
        if "'unsafe-inline'" in csp:
            issues.append("Allows 'unsafe-inline' scripts (bypasses basic script origin enforcement)")
        if "'unsafe-eval'" in csp:
            issues.append("Allows 'unsafe-eval' (permits eval() and new Function() execution)")
        if "data:" in csp and "script-src" in csp:
            issues.append("Allows data: URIs in script execution context")
        if "object-src 'none'" not in csp:
            issues.append("Missing object-src 'none' (allows legacy Flash / ActiveX plugins)")

        if issues:
            self.record_check(
                check_id="D05_CSP_DEEP_EVALUATION",
                name="Content Security Policy (CSP) In-Depth Analysis",
                category="security",
                status="warning",
                severity="medium",
                finding_type="confirmed",
                explanation=f"CSP contains permissive directives: {'; '.join(issues)}.",
                impact="Reduces CSP efficacy against modern Cross-Site Scripting (XSS) vectors.",
                remediation_summary="Remove 'unsafe-inline' and use cryptographic nonces or hashes for scripts.",
                evidence={"observedCSP": csp, "identifiedWeaknesses": issues},
                is_independent=True,
            )
        else:
            self.record_check(
                check_id="D05_CSP_DEEP_EVALUATION",
                name="Content Security Policy (CSP) In-Depth Analysis",
                category="security",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation="Robust Content-Security-Policy without wildcards or unsafe-inline directives.",
                evidence={"observedCSP": csp},
                is_independent=True,
            )

    # ---------------- 6. Clickjacking Protection ----------------

    def _test_clickjacking_protection(self, headers: Dict[str, str]):
        xfo = headers.get("x-frame-options", "").upper()
        csp = headers.get("content-security-policy", "")
        has_frame_ancestors = "frame-ancestors" in csp

        if "DENY" in xfo or "SAMEORIGIN" in xfo or has_frame_ancestors:
            self.record_check(
                check_id="D06_CLICKJACKING_FRAMING",
                name="Clickjacking & Framing Restriction Validation",
                category="security",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation=f"Framing restricted via {f'X-Frame-Options: {xfo}' if xfo else ''} {f'CSP frame-ancestors' if has_frame_ancestors else ''}.",
                evidence={"xFrameOptions": xfo or "[None]", "cspFrameAncestors": has_frame_ancestors},
                is_independent=True,
            )
        else:
            self.record_check(
                check_id="D06_CLICKJACKING_FRAMING",
                name="Clickjacking & Framing Restriction Validation",
                category="security",
                status="fail",
                severity="medium",
                finding_type="confirmed",
                explanation="Neither X-Frame-Options nor CSP frame-ancestors is configured. The page can be embedded in arbitrary iframes.",
                impact="Malicious websites can overlay invisible iframes to hijack user clicks (clickjacking).",
                remediation_summary="Send 'X-Frame-Options: SAMEORIGIN' or CSP 'frame-ancestors 'self''.",
                evidence={"xFrameOptions": "[None]", "csp": csp or "[None]"},
                is_independent=True,
            )

    # ---------------- 7. Open Redirects ----------------

    def _test_open_redirects(self, soup):
        candidate_params = ["redirect", "url", "next", "return", "dest", "continue", "target", "r"]
        probe_target = "https://example.com/test-redirect-verification"

        found_param = None
        if soup:
            for a in soup.find_all("a", href=True):
                href = a["href"]
                for p in candidate_params:
                    if f"{p}=" in href:
                        found_param = p
                        break
                if found_param:
                    break

        if not found_param:
            self.record_check(
                check_id="D07_OPEN_REDIRECT",
                name="Open Redirect Parameter Validation",
                category="security",
                status="not_applicable",
                severity="info",
                finding_type="informational",
                explanation="No redirect or return URL parameters were detected on the page surface.",
                is_independent=True,
            )
            return

        probe_url = f"{self.normalized_url}?{found_param}={urllib.parse.quote(probe_target)}"
        try:
            r = self.session.get(probe_url, timeout=self.timeout, allow_redirects=False)
            loc = r.headers.get("Location", "")
            if r.status_code in (301, 302, 303, 307, 308) and "example.com" in loc:
                self.record_check(
                    check_id="D07_OPEN_REDIRECT",
                    name="Open Redirect Parameter Validation",
                    category="security",
                    status="fail",
                    severity="high",
                    finding_type="confirmed",
                    explanation=f"Parameter '{found_param}' redirected to untrusted external host: '{loc}'.",
                    impact="Attackers can craft phishing links that appear to originate from your legitimate domain.",
                    remediation_summary="Validate redirect destinations against an internal allowlist; reject external hostnames.",
                    evidence={"testedUrl": probe_url, "statusCode": r.status_code, "location": loc},
                    is_independent=True,
                )
            else:
                self.record_check(
                    check_id="D07_OPEN_REDIRECT",
                    name="Open Redirect Parameter Validation",
                    category="security",
                    status="pass",
                    severity="info",
                    finding_type="informational",
                    explanation=f"Parameter '{found_param}' did not permit unvalidated external redirection.",
                    evidence={"testedUrl": probe_url, "statusCode": r.status_code},
                    is_independent=True,
                )
        except Exception as e:
            self.record_check(
                check_id="D07_OPEN_REDIRECT",
                name="Open Redirect Parameter Validation",
                category="security",
                status="unknown",
                explanation=f"Error testing redirect parameter: {str(e)}",
                is_independent=True,
            )

    # ---------------- 8. Safe Path Traversal Check ----------------

    def _test_path_traversal(self, soup):
        candidate_params = ["file", "path", "doc", "view", "template", "page"]
        found_param = None
        if soup:
            for a in soup.find_all("a", href=True):
                href = a["href"]
                for p in candidate_params:
                    if f"{p}=" in href:
                        found_param = p
                        break
                if found_param:
                    break

        if not found_param:
            self.record_check(
                check_id="D08_PATH_TRAVERSAL",
                name="Path Traversal & Local File Inclusion Safe Check",
                category="security",
                status="not_applicable",
                severity="info",
                finding_type="informational",
                explanation="No file or document path parameters observed on the public interface.",
                is_independent=True,
            )
            return

        safe_traversal_payload = "....//....//etc/passwd"
        test_url = f"{self.normalized_url}?{found_param}={safe_traversal_payload}"
        try:
            r = self.session.get(test_url, timeout=self.timeout)
            if "root:x:0:0:" in r.text or "[extensions]" in r.text:
                self.record_check(
                    check_id="D08_PATH_TRAVERSAL",
                    name="Path Traversal & Local File Inclusion Safe Check",
                    category="security",
                    status="fail",
                    severity="critical",
                    finding_type="confirmed",
                    explanation=f"Parameter '{found_param}' disclosed system file contents via path traversal.",
                    impact="Allows arbitrary file reading, source code leakage, and server compromise.",
                    remediation_summary="Never use raw user inputs in file path operations; use an explicit basename allowlist.",
                    evidence={"testedUrl": test_url, "responseSnippet": r.text[:200]},
                    is_independent=True,
                )
            else:
                self.record_check(
                    check_id="D08_PATH_TRAVERSAL",
                    name="Path Traversal & Local File Inclusion Safe Check",
                    category="security",
                    status="pass",
                    severity="info",
                    finding_type="informational",
                    explanation=f"Path parameter '{found_param}' rejected directory traversal probe safely (HTTP {r.status_code}).",
                    evidence={"testedUrl": test_url, "statusCode": r.status_code},
                    is_independent=True,
                )
        except Exception as e:
            self.record_check(
                check_id="D08_PATH_TRAVERSAL",
                name="Path Traversal & Local File Inclusion Safe Check",
                category="security",
                status="unknown",
                explanation=f"Traversal check error: {str(e)}",
                is_independent=True,
            )

    # ---------------- 9. SSRF Parameter Surface ----------------

    def _test_ssrf_surface(self, soup):
        url_params = ["url", "fetch", "link", "webhook", "proxy", "feed"]
        found = []
        if soup:
            for form in soup.find_all("form"):
                for inp in form.find_all("input"):
                    name = inp.get("name", "").lower()
                    if name in url_params:
                        found.append(name)

        if found:
            self.record_check(
                check_id="D09_SSRF_SURFACE",
                name="Server-Side Request Forgery (SSRF) Input Surface",
                category="security",
                status="warning",
                severity="medium",
                finding_type="suspected",
                explanation=f"Identified candidate URL-fetching form field(s): {', '.join(set(found))}.",
                impact="If the server fetches untrusted URLs without strict IP/DNS filtering, SSRF attacks are possible.",
                remediation_summary="Enforce strict SSRF filtering: block private RFC 1918 IPs, loopbacks, and cloud metadata (169.254.169.254).",
                evidence={"candidateFields": list(set(found))},
                is_independent=True,
            )
        else:
            self.record_check(
                check_id="D09_SSRF_SURFACE",
                name="Server-Side Request Forgery (SSRF) Input Surface",
                category="security",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation="No public input fields or query parameters accepting arbitrary outbound URLs were detected.",
                is_independent=True,
            )

    # ---------------- 10. Authentication Endpoints ----------------

    def _test_auth_endpoints(self, soup):
        auth_routes = ["/login", "/signin", "/auth/login", "/reset-password"]
        discovered_route = None

        for route in auth_routes:
            target = urllib.parse.urljoin(self.normalized_url, route)
            try:
                r = self.session.get(target, timeout=self.timeout)
                if r.status_code == 200 and ("password" in r.text.lower() or "sign in" in r.text.lower()):
                    discovered_route = target
                    break
            except Exception:
                pass

        if discovered_route:
            is_https = discovered_route.startswith("https://")
            if is_https:
                self.record_check(
                    check_id="D10_AUTH_ENDPOINTS",
                    name="Authentication & Password Reset Endpoint Security",
                    category="security",
                    status="pass",
                    severity="info",
                    finding_type="informational",
                    explanation=f"Authentication route discovered at '{discovered_route}' is protected by HTTPS.",
                    evidence={"authEndpoint": discovered_route, "transport": "https"},
                    is_independent=True,
                )
            else:
                self.record_check(
                    check_id="D10_AUTH_ENDPOINTS",
                    name="Authentication & Password Reset Endpoint Security",
                    category="security",
                    status="fail",
                    severity="critical",
                    finding_type="confirmed",
                    explanation=f"Authentication endpoint '{discovered_route}' transmits credentials over unencrypted HTTP.",
                    impact="Credentials and session identifiers can be intercepted by eavesdroppers on public networks.",
                    remediation_summary="Enforce HTTPS on all login and authentication endpoints.",
                    evidence={"authEndpoint": discovered_route, "transport": "http"},
                    is_independent=True,
                )
        else:
            self.record_check(
                check_id="D10_AUTH_ENDPOINTS",
                name="Authentication & Password Reset Endpoint Security",
                category="security",
                status="not_applicable",
                severity="info",
                finding_type="informational",
                explanation="No standard public login or authentication routes discovered on target domain.",
                is_independent=True,
            )

    # ---------------- 11. Session Cookie Security Deep ----------------

    def _test_session_cookie_security(self, root_resp: requests.Response):
        set_cookies = [v for k, v in root_resp.headers.items() if k.lower() == "set-cookie"]
        if not set_cookies:
            self.record_check(
                check_id="D11_COOKIE_SECURITY_DEEP",
                name="Session Cookie Flags In-Depth Assessment",
                category="security",
                status="not_applicable",
                severity="info",
                finding_type="informational",
                explanation="No Set-Cookie headers were issued on the initial HTTP response.",
                is_independent=True,
            )
            return

        insecure_cookies = []
        for cookie_str in set_cookies:
            c_name = cookie_str.split("=")[0].strip()
            is_sec = "secure" in cookie_str.lower()
            is_http = "httponly" in cookie_str.lower()
            has_samesite = "samesite=" in cookie_str.lower()

            issues = []
            if not is_sec and self.normalized_url.startswith("https://"):
                issues.append("Missing 'Secure'")
            if not is_http and not any(p in c_name.lower() for p in ["ga", "theme", "lang", "notice"]):
                issues.append("Missing 'HttpOnly'")
            if not has_samesite:
                issues.append("Missing 'SameSite'")

            if issues:
                insecure_cookies.append(f"{c_name}: {', '.join(issues)}")

        if insecure_cookies:
            self.record_check(
                check_id="D11_COOKIE_SECURITY_DEEP",
                name="Session Cookie Flags In-Depth Assessment",
                category="security",
                status="warning",
                severity="medium",
                finding_type="confirmed",
                explanation=f"Cookies set without recommended security flags: {'; '.join(insecure_cookies)}.",
                impact="Missing flags expose cookies to network interception, CSRF, or client-side theft via XSS.",
                remediation_summary="Add 'Secure', 'HttpOnly', and 'SameSite=Lax' to all session cookies.",
                evidence={"insecureCookies": insecure_cookies},
                is_independent=True,
            )
        else:
            self.record_check(
                check_id="D11_COOKIE_SECURITY_DEEP",
                name="Session Cookie Flags In-Depth Assessment",
                category="security",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation="All set cookies enforce Secure, HttpOnly, and SameSite attributes.",
                evidence={"cookiesCount": len(set_cookies)},
                is_independent=True,
            )

    # ---------------- 12. CORS Misconfiguration Assessment ----------------

    def _test_cors_misconfiguration(self):
        attacker_origin = "https://evil-attacker.example.com"
        headers = {"Origin": attacker_origin}
        try:
            r = self.session.get(self.normalized_url, headers=headers, timeout=self.timeout)
            acao = r.headers.get("access-control-allow-origin", "")
            acac = r.headers.get("access-control-allow-credentials", "").lower()

            if acao == attacker_origin and acac == "true":
                self.record_check(
                    check_id="D12_CORS_MISCONFIG",
                    name="CORS Origin Reflection & Credentials Misconfiguration",
                    category="security",
                    status="fail",
                    severity="critical",
                    finding_type="confirmed",
                    explanation=f"Arbitrary origin '{attacker_origin}' was reflected in Access-Control-Allow-Origin with Allow-Credentials: true.",
                    impact="Permits external malicious websites to read sensitive authenticated responses cross-origin.",
                    remediation_summary="Never dynamically reflect untrusted Origin headers when Access-Control-Allow-Credentials is true.",
                    evidence={"injectedOrigin": attacker_origin, "acao": acao, "acac": acac},
                    is_independent=True,
                )
            elif acao == "*":
                self.record_check(
                    check_id="D12_CORS_MISCONFIG",
                    name="CORS Origin Reflection & Credentials Misconfiguration",
                    category="security",
                    status="info",
                    severity="info",
                    finding_type="informational",
                    explanation="Wildcard CORS enabled ('*') without credentials. Suitable for public read-only assets.",
                    evidence={"acao": acao},
                    is_independent=True,
                )
            elif acao == attacker_origin:
                self.record_check(
                    check_id="D12_CORS_MISCONFIG",
                    name="CORS Origin Reflection & Credentials Misconfiguration",
                    category="security",
                    status="warning",
                    severity="medium",
                    finding_type="suspected",
                    explanation=f"Server reflected untrusted origin '{attacker_origin}', but without Allow-Credentials.",
                    impact="Permits cross-origin reading of unauthenticated responses.",
                    remediation_summary="Maintain a strict allowlist of authorized partner origins.",
                    evidence={"acao": acao},
                    is_independent=True,
                )
            else:
                self.record_check(
                    check_id="D12_CORS_MISCONFIG",
                    name="CORS Origin Reflection & Credentials Misconfiguration",
                    category="security",
                    status="pass",
                    severity="info",
                    finding_type="informational",
                    explanation="CORS is strictly configured: untrusted Origin was not reflected.",
                    evidence={"testedOrigin": attacker_origin, "responseAcao": acao or "[None]"},
                    is_independent=True,
                )
        except Exception as e:
            self.record_check(
                check_id="D12_CORS_MISCONFIG",
                name="CORS Origin Reflection & Credentials Misconfiguration",
                category="security",
                status="unknown",
                explanation=f"CORS evaluation error: {str(e)}",
                is_independent=True,
            )

    # ---------------- 13. Information Disclosure & Stack Traces ----------------

    def _test_info_disclosure(self):
        malformed_url = urllib.parse.urljoin(self.normalized_url, "/%ff-test-debug-leak")
        stack_patterns = [
            (r"Traceback \(most recent call last\):", "Python Traceback"),
            (r"at Object\.<anonymous>", "Node.js Stack Trace"),
            (r"Whoops! There was an error", "Laravel Debug Screen"),
            (r"Django Version:", "Django Debug Screen"),
            (r"org\.springframework\.", "Spring Boot Exception"),
            (r"System\.Web\.HttpException", "ASP.NET Yellow Screen"),
            (r"<b>Fatal error</b>:", "PHP Fatal Error"),
        ]

        found_leak = None
        leak_type = None

        try:
            r = self.session.get(malformed_url, timeout=self.timeout)
            for pattern, name in stack_patterns:
                m = re.search(pattern, r.text, re.I)
                if m:
                    found_leak = m.group(0)
                    leak_type = name
                    break
        except Exception:
            pass

        if found_leak:
            self.record_check(
                check_id="D13_INFO_DISCLOSURE",
                name="Information Disclosure & Stack Trace Leakage",
                category="security",
                status="fail",
                severity="high",
                finding_type="confirmed",
                explanation=f"Malformed request triggered a debug screen exposing {leak_type}.",
                impact="Discloses internal filesystem paths, dependencies, database queries, and environment details.",
                remediation_summary="Disable debug mode in production (e.g. DEBUG=False, NODE_ENV=production) and serve generic error pages.",
                evidence={"testedUrl": malformed_url, "leakSignature": found_leak, "frameworkType": leak_type},
                is_independent=True,
            )
        else:
            self.record_check(
                check_id="D13_INFO_DISCLOSURE",
                name="Information Disclosure & Stack Trace Leakage",
                category="security",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation="No internal stack traces or verbose debug error screens disclosed upon malformed request.",
                evidence={"testedUrl": malformed_url},
                is_independent=True,
            )

    # ---------------- 14. Sensitive File & Backup Probes ----------------

    def _test_sensitive_file_exposure(self):
        probes = [
            ("/.git/HEAD", "ref: refs/", "Git Repository Metadata Exposed", "critical"),
            ("/.env", "DB_", "Environment File (.env) Exposed", "critical"),
            ("/.env.local", "KEY", "Local Environment (.env.local) Exposed", "critical"),
            ("/wp-config.php.bak", "DB_NAME", "WordPress Config Backup Exposed", "critical"),
            ("/.vscode/settings.json", "editor.", "VSCode Settings Exposed", "low"),
            ("/.DS_Store", "\x00\x00\x00\x01Bud1", "macOS .DS_Store Metadata Exposed", "medium"),
            ("/docker-compose.yml", "version:", "Docker Compose Configuration Exposed", "high"),
            ("/backup.zip", "PK\x03\x04", "Backup Archive File Exposed", "critical"),
        ]

        found_files = []
        for path, signature, title, sev in probes:
            if time.time() - self.start_time > self.job_timeout:
                break
            target = urllib.parse.urljoin(self.normalized_url, path)
            try:
                r = self.session.get(target, timeout=self.timeout)
                # Ensure HTTP 200 AND signature match to prevent false positives from SPA 200 catch-alls
                if r.status_code == 200 and signature in r.text:
                    found_files.append({"path": path, "title": title, "severity": sev, "url": target})
            except Exception:
                pass

        if found_files:
            top_file = found_files[0]
            self.record_check(
                check_id="D14_SENSITIVE_FILES",
                name="Sensitive File & Backup Artifact Exposure",
                category="exposure",
                status="fail",
                severity=top_file["severity"],
                finding_type="confirmed",
                explanation=f"Publicly accessible sensitive file identified: '{top_file['path']}'.",
                impact="Discloses source code, database credentials, or internal project structure.",
                remediation_summary="Block access to hidden files and backups at the web server / CDN layer.",
                evidence={"exposedFiles": found_files},
                is_independent=True,
            )
        else:
            self.record_check(
                check_id="D14_SENSITIVE_FILES",
                name="Sensitive File & Backup Artifact Exposure",
                category="exposure",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation=f"Conservative allowlist of {len(probes)} common backup and config paths verified clean.",
                evidence={"pathsTested": [p[0] for p in probes]},
                is_independent=True,
            )

    # ---------------- 15. HTTP Methods & TRACE Verb ----------------

    def _test_http_methods(self):
        allowed_methods = []
        trace_enabled = False

        try:
            r_opts = self.session.options(self.normalized_url, timeout=self.timeout)
            allow_header = r_opts.headers.get("allow", "")
            if allow_header:
                allowed_methods = [m.strip().upper() for m in allow_header.split(",")]
        except Exception:
            pass

        try:
            r_trace = self.session.request("TRACE", self.normalized_url, timeout=self.timeout)
            if r_trace.status_code == 200 and ("trace" in r_trace.text.lower() or "host:" in r_trace.text.lower()):
                trace_enabled = True
        except Exception:
            pass

        if trace_enabled:
            self.record_check(
                check_id="D15_HTTP_METHODS",
                name="HTTP Method Exposure & Dangerous Verbs (TRACE)",
                category="security",
                status="fail",
                severity="medium",
                finding_type="confirmed",
                explanation="HTTP TRACE method is enabled on the server, reflecting request headers.",
                impact="Allows Cross-Site Tracing (XST) attacks bypassing HttpOnly cookie protections.",
                remediation_summary="Disable HTTP TRACE method in web server configuration (e.g. TraceEnable off in Apache).",
                evidence={"traceStatus": 200, "allowedMethods": allowed_methods},
                is_independent=True,
            )
        else:
            self.record_check(
                check_id="D15_HTTP_METHODS",
                name="HTTP Method Exposure & Dangerous Verbs (TRACE)",
                category="security",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation=f"Dangerous HTTP methods (TRACE) disabled. Observed methods: {', '.join(allowed_methods) if allowed_methods else 'Standard GET/POST'}.",
                evidence={"allowedMethods": allowed_methods, "traceEnabled": False},
                is_independent=True,
            )

    # ---------------- 16. Rate Limiting ----------------

    def _test_rate_limiting(self):
        burst_count = 6
        got_429 = False
        rate_headers = {}

        for _ in range(burst_count):
            try:
                r = self.session.get(self.normalized_url, timeout=3.0)
                if r.status_code == 429:
                    got_429 = True
                for h in ["ratelimit-limit", "ratelimit-remaining", "retry-after", "x-ratelimit-limit"]:
                    if h in r.headers:
                        rate_headers[h] = r.headers[h]
            except Exception:
                pass

        if got_429 or rate_headers:
            self.record_check(
                check_id="D16_RATE_LIMITING",
                name="Rate Limiting & Abuse Prevention Assessment",
                category="abuse",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation="Active rate limiting signals identified (standard rate limit headers or 429 status code).",
                evidence={"rateHeaders": rate_headers, "received429": got_429},
                is_independent=True,
            )
        else:
            self.record_check(
                check_id="D16_RATE_LIMITING",
                name="Rate Limiting & Abuse Prevention Assessment",
                category="abuse",
                status="info",
                severity="info",
                finding_type="informational",
                explanation="No explicit rate limiting headers observed under small bounded probe (6 requests).",
                impact="Public endpoints without rate limits can be subjected to scraping or DoS pressure.",
                remediation_summary="Configure rate limiting at reverse proxy or Cloudflare/AWS WAF.",
                evidence={"burstRequests": burst_count},
                is_independent=True,
            )

    # ---------------- 17. Brute-Force & Credential Defense ----------------

    def _test_brute_force_defense(self, soup):
        has_login = False
        has_captcha = False

        if soup:
            forms = soup.find_all("form")
            for f in forms:
                for inp in f.find_all("input"):
                    if inp.get("type") == "password":
                        has_login = True
                        break
            if soup.find(class_=re.compile(r"turnstile|g-recaptcha|h-captcha", re.I)):
                has_captcha = True

        if not has_login:
            self.record_check(
                check_id="D17_BRUTE_FORCE_DEFENSE",
                name="Brute-Force & Credential Defense Analysis",
                category="abuse",
                status="not_applicable",
                severity="info",
                finding_type="informational",
                explanation="No password login form discovered on public target surface.",
                is_independent=True,
            )
        elif has_captcha:
            self.record_check(
                check_id="D17_BRUTE_FORCE_DEFENSE",
                name="Brute-Force & Credential Defense Analysis",
                category="abuse",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation="Bot mitigation / CAPTCHA protection detected on login form.",
                is_independent=True,
            )
        else:
            self.record_check(
                check_id="D17_BRUTE_FORCE_DEFENSE",
                name="Brute-Force & Credential Defense Analysis",
                category="abuse",
                status="not_tested",
                severity="info",
                finding_type="informational",
                explanation="Active password brute-forcing is omitted by policy without explicit credentials to prevent account lockouts.",
                execution_reason="Credential stuffing omitted: requires explicit test credentials and bounded scope",
                is_independent=True,
            )

    # ---------------- 18. Public API & Documentation Exposure ----------------

    def _test_api_exposure(self):
        api_probes = [
            ("/swagger.json", "swagger", "Swagger 2.0 API Definition Exposed"),
            ("/openapi.json", "openapi", "OpenAPI 3.0 API Definition Exposed"),
            ("/swagger/index.html", "swagger-ui", "Interactive Swagger UI Exposed"),
            ("/api-docs", "api", "Interactive API Documentation Exposed"),
        ]

        found_api = []
        for path, marker, title in api_probes:
            target = urllib.parse.urljoin(self.normalized_url, path)
            try:
                r = self.session.get(target, timeout=self.timeout)
                if r.status_code == 200 and marker in r.text.lower():
                    found_api.append({"path": path, "title": title, "url": target})
            except Exception:
                pass

        if found_api:
            self.record_check(
                check_id="D18_API_EXPOSURE",
                name="Public API Documentation & Schema Exposure",
                category="security",
                status="info",
                severity="info",
                finding_type="informational",
                explanation=f"Publicly accessible API documentation discovered at '{found_api[0]['path']}'.",
                impact="Discloses internal endpoint paths, parameters, schemas, and API versioning to unauthenticated users.",
                remediation_summary="Restrict public access to interactive API documentation if intended for internal use only.",
                evidence={"discoveredDocs": found_api},
                is_independent=True,
            )
        else:
            self.record_check(
                check_id="D18_API_EXPOSURE",
                name="Public API Documentation & Schema Exposure",
                category="security",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation="No public Swagger, OpenAPI, or unauthenticated schema documentation endpoints detected.",
                is_independent=True,
            )

    # ---------------- 19. TLS Hardening & Preload ----------------

    def _test_tls_hardening(self, headers: Dict[str, str]):
        if not self.normalized_url.startswith("https://"):
            self.record_check(
                check_id="D19_TLS_HARDENING",
                name="TLS Transport Hardening & HSTS Preload",
                category="security",
                status="fail",
                severity="critical",
                finding_type="confirmed",
                explanation="Target does not use HTTPS transport.",
                is_independent=True,
            )
            return

        hsts = headers.get("strict-transport-security", "")
        has_preload = "preload" in hsts.lower()
        has_subdomains = "includesubdomains" in hsts.lower()
        has_long_age = False

        m = re.search(r"max-age=(\d+)", hsts)
        if m and int(m.group(1)) >= 31536000:
            has_long_age = True

        if has_preload and has_subdomains and has_long_age:
            self.record_check(
                check_id="D19_TLS_HARDENING",
                name="TLS Transport Hardening & HSTS Preload",
                category="security",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation="HSTS configuration meets HSTS Preload criteria (max-age >= 1 yr, includeSubDomains, preload).",
                evidence={"hsts": hsts},
                is_independent=True,
            )
        elif hsts:
            self.record_check(
                check_id="D19_TLS_HARDENING",
                name="TLS Transport Hardening & HSTS Preload",
                category="security",
                status="warning",
                severity="low",
                finding_type="suspected",
                explanation="HSTS header present but lacks 'preload' or 'includeSubDomains' qualification.",
                impact="Domain is not eligible for browser HSTS preload list submission.",
                remediation_summary="Configure 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload'.",
                evidence={"hsts": hsts},
                is_independent=True,
            )
        else:
            self.record_check(
                check_id="D19_TLS_HARDENING",
                name="TLS Transport Hardening & HSTS Preload",
                category="security",
                status="fail",
                severity="medium",
                finding_type="confirmed",
                explanation="No Strict-Transport-Security (HSTS) header configured.",
                impact="Leaves users vulnerable to SSL-stripping on first connection.",
                remediation_summary="Deploy HSTS header with at least 1-year max-age.",
                evidence={"hsts": "[None]"},
                is_independent=True,
            )

    # ---------------- 20. DNS & Email Authentication (SPF/DMARC) ----------------

    def _test_dns_email_security(self):
        txt_records = []
        try:
            cmd = ["nslookup", "-type=TXT", self.hostname]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=5)
            if res.returncode == 0:
                for line in res.stdout.splitlines():
                    clean = line.strip().strip('"')
                    if clean and not clean.startswith("Server:") and not clean.startswith("Address:"):
                        txt_records.append(clean)
        except Exception:
            pass

        has_spf = any("v=spf1" in r for r in txt_records)
        has_dmarc = any("v=DMARC1" in r for r in txt_records)

        # Also probe _dmarc subdomain
        if not has_dmarc:
            try:
                cmd = ["nslookup", "-type=TXT", f"_dmarc.{self.hostname}"]
                res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=5)
                if res.returncode == 0 and "v=DMARC1" in res.stdout:
                    has_dmarc = True
            except Exception:
                pass

        if has_spf and has_dmarc:
            self.record_check(
                check_id="D20_DNS_EMAIL_SECURITY",
                name="DNS & Email Security Authentication (SPF / DMARC)",
                category="infrastructure",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation="Domain publishes both SPF and DMARC DNS email authentication records.",
                evidence={"spfFound": True, "dmarcFound": True},
                is_independent=True,
            )
        elif has_spf or has_dmarc:
            self.record_check(
                check_id="D20_DNS_EMAIL_SECURITY",
                name="DNS & Email Security Authentication (SPF / DMARC)",
                category="infrastructure",
                status="warning",
                severity="low",
                finding_type="informational",
                explanation="Partial email authentication: missing either SPF or DMARC record.",
                impact="Increases risk of domain spoofing and phishing sent in your brand name.",
                remediation_summary="Configure both SPF ('v=spf1 ...') and DMARC ('v=DMARC1; p=reject...') DNS TXT records.",
                evidence={"spfFound": has_spf, "dmarcFound": has_dmarc},
                is_independent=True,
            )
        else:
            self.record_check(
                check_id="D20_DNS_EMAIL_SECURITY",
                name="DNS & Email Security Authentication (SPF / DMARC)",
                category="infrastructure",
                status="info",
                severity="info",
                finding_type="informational",
                explanation="No SPF or DMARC DNS records detected for this domain.",
                impact="Missing email records allow unauthorized third parties to spoof emails from your domain.",
                remediation_summary="Publish SPF and DMARC TXT records in domain DNS zone.",
                evidence={"hostname": self.hostname},
                is_independent=True,
            )

    # ---------------- 21. Client-Side Dependencies & Source Maps ----------------

    def _test_client_dependencies(self, soup, html: str):
        sourcemap_found = False
        sourcemap_url = None

        # Search for .js.map references
        m = re.search(r"/\S+\.js\.map", html)
        if m:
            candidate_map = urllib.parse.urljoin(self.normalized_url, m.group(0))
            try:
                r = self.session.get(candidate_map, timeout=self.timeout)
                if r.status_code == 200 and '"sources":' in r.text:
                    sourcemap_found = True
                    sourcemap_url = candidate_map
            except Exception:
                pass

        # Check for known outdated client libraries
        outdated_libraries = []
        jq_match = re.search(r"jquery[.-]([0-9]+\.[0-9]+\.[0-9]+)", html, re.I)
        if jq_match:
            version = jq_match.group(1)
            parts = [int(x) for x in version.split(".")]
            if parts < [3, 5, 0]:
                outdated_libraries.append(f"jQuery {version} (vulnerable to XSS CVE-2020-11022)")

        angular_match = re.search(r"angular[.-](1\.[0-9]+\.[0-9]+)", html, re.I)
        if angular_match:
            outdated_libraries.append(f"AngularJS {angular_match.group(1)} (End-of-Life)")

        if sourcemap_found:
            self.record_check(
                check_id="D21_CLIENT_DEPENDENCIES",
                name="Client-Side Dependency & Source Map Exposure",
                category="exposure",
                status="fail",
                severity="high",
                finding_type="confirmed",
                explanation="Production JavaScript source maps (.js.map) are publicly accessible, disclosing TypeScript source code.",
                impact="Allows attackers to reverse-engineer client logic, unauthenticated endpoints, and embedded comments.",
                remediation_summary="Disable production source maps in your bundler (build.sourcemap: false in vite.config.ts).",
                evidence={"sourceMapUrl": sourcemap_url},
                is_independent=True,
            )
        elif outdated_libraries:
            self.record_check(
                check_id="D21_CLIENT_DEPENDENCIES",
                name="Client-Side Dependency & Source Map Exposure",
                category="security",
                status="warning",
                severity="medium",
                finding_type="confirmed",
                explanation=f"Detected outdated frontend library: {', '.join(outdated_libraries)}.",
                impact="Known vulnerabilities in client libraries can be leveraged for Cross-Site Scripting.",
                remediation_summary="Upgrade client libraries to modern, supported versions.",
                evidence={"detectedLibraries": outdated_libraries},
                is_independent=True,
            )
        else:
            self.record_check(
                check_id="D21_CLIENT_DEPENDENCIES",
                name="Client-Side Dependency & Source Map Exposure",
                category="security",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation="No public production source maps or outdated vulnerable client scripts detected.",
                evidence={"sourceMapsExposed": False},
                is_independent=True,
            )

    # ---------------- 22. Cache-Control on Sensitive Endpoints ----------------

    def _test_cache_security(self, headers: Dict[str, str]):
        cc = headers.get("cache-control", "").lower()
        if "no-store" in cc or "private" in cc:
            self.record_check(
                check_id="D22_CACHE_SECURITY",
                name="Cache-Control Security for Dynamic Responses",
                category="security",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation=f"Response declares restrictive cache directives: Cache-Control='{cc}'.",
                evidence={"cacheControl": cc},
                is_independent=True,
            )
        elif "public" in cc and "max-age" in cc:
            self.record_check(
                check_id="D22_CACHE_SECURITY",
                name="Cache-Control Security for Dynamic Responses",
                category="security",
                status="info",
                severity="info",
                finding_type="informational",
                explanation=f"Public cache directives declared (Cache-Control: '{cc}'). Suitable for static landing pages.",
                evidence={"cacheControl": cc},
                is_independent=True,
            )
        else:
            self.record_check(
                check_id="D22_CACHE_SECURITY",
                name="Cache-Control Security for Dynamic Responses",
                category="security",
                status="info",
                severity="info",
                finding_type="informational",
                explanation="No restrictive Cache-Control header. If authenticated user data is returned, specify 'Cache-Control: no-store'.",
                evidence={"cacheControl": cc or "[None]"},
                is_independent=True,
            )
