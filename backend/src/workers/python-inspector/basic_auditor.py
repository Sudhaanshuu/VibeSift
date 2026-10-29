#!/usr/bin/env python3
"""
VibeSift Basic Audit Engine
Performs fast, low-impact, non-intrusive evaluation of:
- Website completeness & trust signals (12 checks)
- SEO & discoverability (13 checks)
- Performance & technical health indicators (9 checks)
Total: 34 structured checks.
Every check produces an evidence-backed AuditCheckResult (pass, fail, warning, info, not_tested, not_applicable).
Failing or warning checks are also translated into Findings for backward compatibility.
"""

import json
import logging
import re
import socket
import ssl
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

logger = logging.getLogger("BasicAuditor")


class BasicAuditor:
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
        self.visited_urls: Set[str] = set()

    def record_check(
        self,
        check_id: str,
        name: str,
        category: str,
        status: str,  # pass, fail, warning, info, not_tested, not_applicable, unknown
        severity: str = "info",  # critical, high, medium, low, info
        finding_type: str = "informational",  # confirmed, suspected, informational
        explanation: str = "",
        impact: str = "",
        remediation_summary: str = "",
        remediation_snippet: Optional[str] = None,
        doc_url: Optional[str] = None,
        evidence: Optional[Dict[str, Any]] = None,
        legal_citation: Optional[str] = None,
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
            "auditMode": "basic",
            "explanation": explanation,
            "impact": impact,
            "remediation": {
                "summary": remediation_summary,
                "codeSnippet": remediation_snippet,
                "docUrl": doc_url,
            },
            "evidence": evidence or {},
            "testTimestamp": now_iso,
            "scope": f"basic_public:{self.hostname}",
            "isIndependent": is_independent,
            "executionReason": execution_reason,
            "legalCitation": legal_citation,
        }
        self.checks.append(check_obj)

        # If failing or warning or info, generate a backward-compatible Finding
        if status in ("fail", "warning", "info") and finding_type in ("confirmed", "suspected"):
            finding_id = f"fnd_basic_{self.scan_id[:8]}_{len(self.findings) + 1}_{check_id.lower()}"
            self.findings.append({
                "id": finding_id,
                "scanId": self.scan_id,
                "ruleId": check_id,
                "category": category,
                "severity": severity,
                "confidence": "high" if finding_type == "confirmed" else "medium",
                "title": name,
                "description": explanation,
                "affectedUrl": evidence.get("testedUrl") if evidence else self.normalized_url,
                "detectionMethod": "passive",
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

    def run_suite(self) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Any]]:
        logger.info(f"[BasicAuditor] Starting Basic Audit suite for {self.normalized_url}")

        # 1. Main Page Fetch with Redirect Chain Tracking
        main_resp, redirect_history = self._fetch_main_page()
        self.main_resp = main_resp

        if main_resp is None:
            logger.warning("[BasicAuditor] Root page is unreachable. Skipping dependent page probes.")
            unreachable_checks = [
                ("B01_FOOTER_EXISTS", "Footer Presence and Completeness", "completeness"),
                ("B02_CONTACT_PAGE", "Contact Information and Support Page", "completeness"),
                ("B03_ABOUT_PAGE", "About Us Page Presence", "completeness"),
                ("B04_PRIVACY_POLICY", "Privacy Policy Availability", "completeness"),
                ("B05_TERMS_CONDITIONS", "Terms and Conditions Availability", "completeness"),
                ("B06_COOKIE_POLICY", "Cookie Policy Availability", "completeness"),
                ("B07_BROKEN_LINKS", "Broken Internal Link Discovery", "completeness"),
                ("B08_FAVICON", "Favicon Discovery and Specification", "completeness"),
                ("B09_SOCIAL_METADATA", "Open Graph and Twitter Card Metadata", "seo"),
                ("B10_CANONICAL_URL", "Canonical Tag Configuration", "seo"),
                ("B11_404_HANDLING", "Proper 404 Not Found Status Handling", "completeness"),
                ("B12_ROBOTS_TXT", "Robots.txt Presence and Formatting", "seo"),
                ("B13_SITEMAP_XML", "XML Sitemap Presence and Discovery", "seo"),
                ("B14_SECURITY_TXT", "Security.txt Responsible Disclosure Policy", "security"),
                ("B15_PAGE_TITLE", "Title Tag Presence and Length", "seo"),
                ("B16_META_DESCRIPTION", "Meta Description Tag Presence", "seo"),
                ("B17_H1_HEADINGS", "H1 Heading Count and Structure", "seo"),
                ("B18_IMAGE_ALT", "Image Descriptive Alt Attribute Coverage", "accessibility"),
                ("B19_CANONICAL_VALIDITY", "Canonical URL Status Validation", "seo"),
                ("B20_HTTPS_REDIRECT", "HTTP to HTTPS Automatic Upgrade", "security"),
                ("B21_MIXED_CONTENT", "Mixed Active/Passive Content Over HTTPS", "security"),
                ("B22_HTML_LANG", "HTML Lang Attribute Declaration", "accessibility"),
                ("B23_INDEXABILITY", "Search Engine Indexability Directives", "seo"),
                ("B24_STRUCTURED_DATA", "JSON-LD / Schema.org Structured Data", "seo"),
                ("B25_HTML_SIZE", "Initial HTML Document Payload Size", "performance"),
                ("B26_RESOURCE_COUNTS", "Total External CSS and JavaScript Resources", "performance"),
                ("B27_IMAGE_DIMENSIONS", "Image Explicit Width and Height Dimensions", "performance"),
                ("B28_RESOURCE_COMPRESSION", "Text Content Compression (Gzip / Brotli)", "performance"),
                ("B29_STATIC_CACHE", "Static Asset Cache-Control Header Directives", "performance"),
                ("B30_REDIRECT_CHAINS", "Redirect Chain Length and Hop Count", "performance"),
                ("B31_MOBILE_VIEWPORT", "Mobile Responsive Viewport Meta Configuration", "performance"),
                ("B32_A11Y_LANDMARKS", "Accessible ARIA Landmark Structure and Form Labels", "accessibility"),
            ]
            for check_id, name, cat in unreachable_checks:
                self.record_check(
                    check_id=check_id,
                    name=name,
                    category=cat,
                    status="not_tested",
                    finding_type="informational",
                    explanation=f"Skipped because the root website is unreachable ({self.normalized_url}).",
                    execution_reason="Target host unreachable",
                )
            tls_info = {"scheme": "https" if self.normalized_url.startswith("https") else "http", "tlsVersion": None, "certValid": False}
            logger.info(f"[BasicAuditor] Finished Basic suite for unreachable target. Executed {len(self.checks)} checks.")
            return self.checks, self.findings, tls_info

        html_text = main_resp.text if main_resp else ""
        soup = BeautifulSoup(html_text, "html.parser") if (BeautifulSoup and html_text) else None

        # 2. Completeness & Trust Checks
        self._check_footer_presence(soup, html_text)
        self._check_contact_page(soup, html_text)
        self._check_about_page(soup, html_text)
        self._check_privacy_policy_page(soup, html_text)
        self._check_terms_page(soup, html_text)
        self._check_cookie_policy_page(soup, html_text)
        self._check_broken_links(soup)
        self._check_favicon(soup)
        self._check_social_metadata(soup, html_text)
        self._check_canonical_url(soup)
        self._check_404_handling()

        # 3. SEO & Discoverability Checks
        self._check_robots_txt()
        self._check_sitemap_xml()
        self._check_security_txt()
        self._check_page_title(soup, html_text)
        self._check_meta_description(soup, html_text)
        self._check_h1_headings(soup, html_text)
        self._check_image_alt_texts(soup)
        self._check_canonical_validity(soup)
        self._check_http_to_https_redirect()
        self._check_mixed_content(soup)
        self._check_html_lang(soup, html_text)
        self._check_indexability_directives(main_resp, soup)
        self._check_structured_data(soup, html_text)

        # 4. Performance & Technical Quality
        self._check_html_size(main_resp)
        self._check_resource_counts(soup)
        self._check_image_dimensions(soup)
        self._check_resource_compression(main_resp)
        self._check_static_cache_headers(main_resp)
        self._check_redirect_chains(redirect_history)
        tls_info = self._check_tls_certificate()
        self._check_mobile_viewport(soup, html_text)
        self._check_a11y_landmarks_and_labels(soup)

        logger.info(f"[BasicAuditor] Finished Basic suite. Executed {len(self.checks)} checks.")
        return self.checks, self.findings, tls_info

    # ---------------- Helper Fetching ----------------

    def _fetch_main_page(self) -> Tuple[Optional[requests.Response], List[str]]:
        redirect_chain = []
        try:
            resp = self.session.get(self.normalized_url, timeout=self.timeout)
            self.visited_urls.add(self.normalized_url)
            if resp.history:
                for r in resp.history:
                    redirect_chain.append(f"{r.status_code} -> {r.url}")
            redirect_chain.append(f"{resp.status_code} -> {resp.url}")
            return resp, redirect_chain
        except Exception as e:
            logger.warning(f"Failed to fetch homepage {self.normalized_url}: {e}")
            self.record_check(
                check_id="B00_PAGE_ACCESSIBLE",
                name="Main Page Accessibility",
                category="completeness",
                status="fail",
                severity="critical",
                finding_type="confirmed",
                explanation=f"Server unreachable or failed to respond: {str(e)}",
                impact="Visitors and search crawlers cannot access the website.",
                remediation_summary="Verify DNS configuration, server uptime, and firewall rules.",
                evidence={"testedUrl": self.normalized_url, "error": str(e)},
            )
            return None, redirect_chain

    # ---------------- Category A: Completeness & Trust ----------------

    def _check_footer_presence(self, soup, html: str):
        if not soup:
            self.record_check(
                check_id="B01_FOOTER_EXISTS",
                name="Footer Presence and Completeness",
                category="completeness",
                status="unknown",
                explanation="Could not parse HTML DOM structure to locate footer.",
                execution_reason="HTML parser unavailable",
            )
            return

        footer = soup.find("footer")
        if not footer:
            footer = soup.find(attrs={"role": "contentinfo"}) or soup.find(class_=re.compile(r"footer", re.I))

        if footer:
            text = footer.get_text(separator=" ", strip=True)[:150]
            has_copyright = bool(re.search(r"(©|copyright|\b\d{4}\b)", text, re.I))
            has_links = len(footer.find_all("a")) > 0
            if has_copyright and has_links:
                self.record_check(
                    check_id="B01_FOOTER_EXISTS",
                    name="Footer Presence and Completeness",
                    category="completeness",
                    status="pass",
                    severity="info",
                    finding_type="informational",
                    explanation="Comprehensive footer found with copyright and navigation links.",
                    evidence={"domSelector": "footer", "textSnippet": text},
                )
            else:
                self.record_check(
                    check_id="B01_FOOTER_EXISTS",
                    name="Footer Presence and Completeness",
                    category="completeness",
                    status="warning",
                    severity="low",
                    finding_type="suspected",
                    explanation="Footer tag found but lacks copyright notice or standard secondary links.",
                    impact="Reduces user trust signals and baseline navigation quality.",
                    remediation_summary="Include a copyright notice and essential legal links inside <footer>.",
                    evidence={"domSelector": "footer", "textSnippet": text},
                )
        else:
            self.record_check(
                check_id="B01_FOOTER_EXISTS",
                name="Footer Presence and Completeness",
                category="completeness",
                status="fail",
                severity="medium",
                finding_type="confirmed",
                explanation="No <footer> tag or contentinfo role element was detected on the page.",
                impact="Users cannot locate legal, contact, and structural navigation elements.",
                remediation_summary="Add a semantic <footer> element containing copyright, contact, and legal links.",
                evidence={"testedUrl": self.normalized_url},
            )

    def _check_contact_page(self, soup, html: str):
        if not soup:
            return
        contact_link = None
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            text = a.get_text(strip=True).lower()
            if "contact" in href.lower() or "contact" in text or href.startswith("mailto:"):
                contact_link = href
                break

        if contact_link:
            self.record_check(
                check_id="B02_CONTACT_PAGE",
                name="Contact Page Availability",
                category="completeness",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation=f"Contact navigation signal identified: '{contact_link}'.",
                evidence={"contactLink": contact_link},
            )
        else:
            # Check standard /contact path
            contact_url = urllib.parse.urljoin(self.normalized_url, "/contact")
            try:
                resp = self.session.get(contact_url, timeout=self.timeout)
                if resp.status_code < 400:
                    self.record_check(
                        check_id="B02_CONTACT_PAGE",
                        name="Contact Page Availability",
                        category="completeness",
                        status="pass",
                        severity="info",
                        finding_type="informational",
                        explanation=f"Direct /contact endpoint is reachable (HTTP {resp.status_code}).",
                        evidence={"testedUrl": contact_url, "statusCode": resp.status_code},
                    )
                    return
            except Exception:
                pass

            self.record_check(
                check_id="B02_CONTACT_PAGE",
                name="Contact Page Availability",
                category="completeness",
                status="warning",
                severity="low",
                finding_type="suspected",
                explanation="No contact page link or mailto: link was identified on the homepage.",
                impact="Visitors cannot easily reach the website owners for inquiries or support.",
                remediation_summary="Provide a clear link to a Contact Us page or direct email in the header or footer.",
                evidence={"testedUrl": self.normalized_url},
            )

    def _check_about_page(self, soup, html: str):
        if not soup:
            return
        about_link = None
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            text = a.get_text(strip=True).lower()
            if any(k in href.lower() or k in text for k in ["about", "who-we-are", "company", "team"]):
                about_link = href
                break

        if about_link:
            self.record_check(
                check_id="B03_ABOUT_PAGE",
                name="About Page Availability",
                category="completeness",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation=f"About page link discovered: '{about_link}'.",
                evidence={"aboutLink": about_link},
            )
        else:
            about_url = urllib.parse.urljoin(self.normalized_url, "/about")
            try:
                resp = self.session.get(about_url, timeout=self.timeout)
                if resp.status_code < 400:
                    self.record_check(
                        check_id="B03_ABOUT_PAGE",
                        name="About Page Availability",
                        category="completeness",
                        status="pass",
                        severity="info",
                        finding_type="informational",
                        explanation=f"Direct /about endpoint is reachable (HTTP {resp.status_code}).",
                        evidence={"testedUrl": about_url, "statusCode": resp.status_code},
                    )
                    return
            except Exception:
                pass

            self.record_check(
                check_id="B03_ABOUT_PAGE",
                name="About Page Availability",
                category="completeness",
                status="info",
                severity="info",
                finding_type="informational",
                explanation="No clear 'About Us' link detected on the primary page.",
                impact="An About page establishes brand credibility and organizational transparency.",
                remediation_summary="Consider adding an About Us link in the navigation or footer.",
                evidence={"testedUrl": self.normalized_url},
            )

    def _check_privacy_policy_page(self, soup, html: str):
        privacy_link = None
        if soup:
            for a in soup.find_all("a", href=True):
                href = a["href"].strip()
                text = a.get_text(strip=True).lower()
                if "privacy" in href.lower() or "privacy" in text:
                    privacy_link = urllib.parse.urljoin(self.normalized_url, href)
                    break

        if not privacy_link:
            for candidate in ["/privacy", "/privacy-policy", "/privacy.html"]:
                cand_url = urllib.parse.urljoin(self.normalized_url, candidate)
                try:
                    resp = self.session.get(cand_url, timeout=self.timeout)
                    if resp.status_code < 400:
                        privacy_link = cand_url
                        break
                except Exception:
                    pass

        if privacy_link:
            self.record_check(
                check_id="B04_PRIVACY_POLICY",
                name="Privacy Policy Availability",
                category="completeness",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation=f"Privacy Policy link located and reachable at '{privacy_link}'.",
                evidence={"privacyPolicyUrl": privacy_link},
            )
        else:
            self.record_check(
                check_id="B04_PRIVACY_POLICY",
                name="Privacy Policy Availability",
                category="completeness",
                status="fail",
                severity="high",
                finding_type="confirmed",
                explanation="No Privacy Policy link found on the homepage or standard /privacy paths.",
                impact="Non-compliance with global and regional privacy regulations (GDPR, CCPA, DPDP Act 2023).",
                remediation_summary="Publish a dedicated Privacy Policy page and link it prominently in the footer.",
                evidence={"testedUrl": self.normalized_url},
            )

    def _check_terms_page(self, soup, html: str):
        terms_link = None
        if soup:
            for a in soup.find_all("a", href=True):
                href = a["href"].strip()
                text = a.get_text(strip=True).lower()
                if any(k in href.lower() or k in text for k in ["terms", "tos", "conditions"]):
                    terms_link = urllib.parse.urljoin(self.normalized_url, href)
                    break

        if not terms_link:
            for candidate in ["/terms", "/terms-of-service", "/tos"]:
                cand_url = urllib.parse.urljoin(self.normalized_url, candidate)
                try:
                    resp = self.session.get(cand_url, timeout=self.timeout)
                    if resp.status_code < 400:
                        terms_link = cand_url
                        break
                except Exception:
                    pass

        if terms_link:
            self.record_check(
                check_id="B05_TERMS_CONDITIONS",
                name="Terms and Conditions Availability",
                category="completeness",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation=f"Terms & Conditions page identified at '{terms_link}'.",
                evidence={"termsUrl": terms_link},
            )
        else:
            self.record_check(
                check_id="B05_TERMS_CONDITIONS",
                name="Terms and Conditions Availability",
                category="completeness",
                status="warning",
                severity="low",
                finding_type="suspected",
                explanation="No Terms and Conditions link found on the homepage or common paths.",
                impact="Leaves website terms, intellectual property, and user obligations legally undefined.",
                remediation_summary="Publish Terms of Service and link it in the website footer.",
                evidence={"testedUrl": self.normalized_url},
            )

    def _check_cookie_policy_page(self, soup, html: str):
        cookie_link = None
        if soup:
            for a in soup.find_all("a", href=True):
                href = a["href"].strip()
                text = a.get_text(strip=True).lower()
                if "cookie" in href.lower() or "cookie" in text:
                    cookie_link = urllib.parse.urljoin(self.normalized_url, href)
                    break

        has_banner = False
        if soup:
            has_banner = bool(
                soup.find(id=re.compile(r"cookie|consent", re.I))
                or soup.find(class_=re.compile(r"cookie|consent", re.I))
            )

        if cookie_link or has_banner:
            self.record_check(
                check_id="B06_COOKIE_POLICY",
                name="Cookie Policy / Notice Availability",
                category="completeness",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation="Dedicated cookie policy or cookie consent notice was identified.",
                evidence={"cookieLink": cookie_link, "hasConsentBanner": has_banner},
            )
        else:
            self.record_check(
                check_id="B06_COOKIE_POLICY",
                name="Cookie Policy / Notice Availability",
                category="completeness",
                status="info",
                severity="info",
                finding_type="informational",
                explanation="No separate Cookie Policy link or banner was detected on initial page render.",
                impact="If cookies or local storage trackers are set, transparency requirements may apply.",
                remediation_summary="Disclose cookie usage in a dedicated policy or inside the Privacy Policy.",
                evidence={"testedUrl": self.normalized_url},
            )

    def _check_broken_links(self, soup):
        if not soup:
            self.record_check(
                check_id="B07_BROKEN_INTERNAL_LINKS",
                name="Broken Internal Links",
                category="completeness",
                status="not_tested",
                explanation="DOM parsing unavailable for link sampling.",
            )
            self.record_check(
                check_id="B08_BROKEN_EXTERNAL_LINKS",
                name="Broken External Links",
                category="completeness",
                status="not_tested",
                explanation="DOM parsing unavailable for link sampling.",
            )
            return

        internal_links = []
        external_links = []

        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if not href or href.startswith("#") or href.startswith("javascript:") or href.startswith("mailto:") or href.startswith("tel:"):
                continue
            full_url = urllib.parse.urljoin(self.normalized_url, href)
            parsed = urllib.parse.urlsplit(full_url)
            if parsed.scheme in ("http", "https"):
                if parsed.hostname and parsed.hostname.lower() == self.hostname:
                    if full_url not in internal_links and full_url != self.normalized_url:
                        internal_links.append(full_url)
                else:
                    if full_url not in external_links:
                        external_links.append(full_url)

        # Sample up to 5 internal links
        broken_internal = []
        for link in internal_links[:5]:
            try:
                r = self.session.get(link, timeout=4.0)
                if r.status_code >= 400:
                    broken_internal.append({"url": link, "status": r.status_code})
            except Exception as e:
                broken_internal.append({"url": link, "error": str(e)})

        if broken_internal:
            self.record_check(
                check_id="B07_BROKEN_INTERNAL_LINKS",
                name="Broken Internal Links",
                category="completeness",
                status="fail",
                severity="medium",
                finding_type="confirmed",
                explanation=f"Found {len(broken_internal)} broken internal link(s) on the sampled page.",
                impact="Hurts user experience, creates navigation dead-ends, and impairs crawl budget.",
                remediation_summary="Update or remove dead internal links.",
                evidence={"brokenLinks": broken_internal},
            )
        else:
            self.record_check(
                check_id="B07_BROKEN_INTERNAL_LINKS",
                name="Broken Internal Links",
                category="completeness",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation=f"All {min(len(internal_links), 5)} sampled internal links resolved successfully.",
                evidence={"testedInternalCount": min(len(internal_links), 5)},
            )

        # Sample up to 3 external links
        broken_external = []
        for link in external_links[:3]:
            try:
                r = self.session.head(link, timeout=4.0, allow_redirects=True)
                if r.status_code >= 400:
                    broken_external.append({"url": link, "status": r.status_code})
            except Exception:
                pass

        if broken_external:
            self.record_check(
                check_id="B08_BROKEN_EXTERNAL_LINKS",
                name="Broken External Links",
                category="completeness",
                status="warning",
                severity="low",
                finding_type="suspected",
                explanation=f"Sampled external link returned HTTP error.",
                impact="Outbound broken links impair domain trust and user satisfaction.",
                remediation_summary="Verify external link URLs or remove dead outbound references.",
                evidence={"brokenExternalLinks": broken_external},
            )
        else:
            self.record_check(
                check_id="B08_BROKEN_EXTERNAL_LINKS",
                name="Broken External Links",
                category="completeness",
                status="pass" if external_links else "not_applicable",
                severity="info",
                finding_type="informational",
                explanation="Sampled external links resolved without errors." if external_links else "No external links present on page.",
                evidence={"testedExternalCount": min(len(external_links), 3)},
            )

    def _check_favicon(self, soup):
        favicon_url = None
        if soup:
            icon_tag = soup.find("link", rel=re.compile(r"^(shortcut )?icon$", re.I))
            if icon_tag and icon_tag.get("href"):
                favicon_url = urllib.parse.urljoin(self.normalized_url, icon_tag["href"])

        if not favicon_url:
            favicon_url = urllib.parse.urljoin(self.normalized_url, "/favicon.ico")

        try:
            resp = self.session.get(favicon_url, timeout=self.timeout)
            if resp.status_code < 400 and len(resp.content) > 0:
                self.record_check(
                    check_id="B09_FAVICON_AVAILABILITY",
                    name="Favicon Availability and Validity",
                    category="completeness",
                    status="pass",
                    severity="info",
                    finding_type="informational",
                    explanation=f"Valid favicon discovered at '{favicon_url}' (HTTP {resp.status_code}).",
                    evidence={"faviconUrl": favicon_url, "contentLength": len(resp.content)},
                )
                return
        except Exception:
            pass

        self.record_check(
            check_id="B09_FAVICON_AVAILABILITY",
            name="Favicon Availability and Validity",
            category="completeness",
            status="warning",
            severity="low",
            finding_type="suspected",
            explanation=f"Favicon was missing or returned an error at '{favicon_url}'.",
            impact="Browsers and search result snippets display generic placeholder icons.",
            remediation_summary="Deploy a favicon.ico at root or declare a <link rel='icon' href='...'> tag.",
            evidence={"testedUrl": favicon_url},
        )

    def _check_social_metadata(self, soup, html: str):
        if not soup:
            return

        og_tags = {}
        twitter_tags = {}

        for meta in soup.find_all("meta"):
            prop = meta.get("property", "")
            name = meta.get("name", "")
            content = meta.get("content", "")

            if prop.startswith("og:"):
                og_tags[prop] = content
            if name.startswith("twitter:"):
                twitter_tags[name] = content

        has_og = "og:title" in og_tags and ("og:image" in og_tags or "og:description" in og_tags)
        has_twitter = "twitter:card" in twitter_tags or "twitter:title" in twitter_tags

        if has_og and has_twitter:
            self.record_check(
                check_id="B10_SOCIAL_METADATA",
                name="Social Sharing Metadata (Open Graph & Twitter Cards)",
                category="seo",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation="Both Open Graph and Twitter card metadata tags are configured.",
                evidence={"ogTags": list(og_tags.keys()), "twitterTags": list(twitter_tags.keys())},
            )
        elif has_og or has_twitter:
            self.record_check(
                check_id="B10_SOCIAL_METADATA",
                name="Social Sharing Metadata (Open Graph & Twitter Cards)",
                category="seo",
                status="warning",
                severity="low",
                finding_type="suspected",
                explanation="Partial social sharing metadata: missing Open Graph or Twitter Card tags.",
                impact="Links shared on social platforms (Slack, LinkedIn, X, Discord) will lack rich preview cards.",
                remediation_summary="Add complete og:title, og:description, og:image, and twitter:card tags.",
                evidence={"ogTags": list(og_tags.keys()), "twitterTags": list(twitter_tags.keys())},
            )
        else:
            self.record_check(
                check_id="B10_SOCIAL_METADATA",
                name="Social Sharing Metadata (Open Graph & Twitter Cards)",
                category="seo",
                status="fail",
                severity="low",
                finding_type="confirmed",
                explanation="No Open Graph or Twitter sharing metadata tags were found on the page.",
                impact="Shared URLs on social media and chat apps appear as plain unformatted links.",
                remediation_summary="Add og:title, og:image, og:url, og:description and twitter:card meta tags.",
                evidence={"testedUrl": self.normalized_url},
            )

    def _check_canonical_url(self, soup):
        if not soup:
            return
        canonical = soup.find("link", rel=re.compile(r"^canonical$", re.I))
        if canonical and canonical.get("href"):
            self.record_check(
                check_id="B11_CANONICAL_URL",
                name="Canonical URL Declaration",
                category="seo",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation=f"rel='canonical' tag properly declared: '{canonical['href']}'.",
                evidence={"canonicalHref": canonical["href"]},
            )
        else:
            self.record_check(
                check_id="B11_CANONICAL_URL",
                name="Canonical URL Declaration",
                category="seo",
                status="fail",
                severity="low",
                finding_type="confirmed",
                explanation="Page lacks a <link rel='canonical'> tag in the <head> section.",
                impact="Search engines may index duplicate variations of URLs with parameters or protocol mismatches.",
                remediation_summary="Specify <link rel='canonical' href='https://yourdomain.com/' /> inside <head>.",
                evidence={"testedUrl": self.normalized_url},
            )

    def _check_404_handling(self):
        random_path = f"/non-existent-test-page-{int(time.time())}-404"
        probe_url = urllib.parse.urljoin(self.normalized_url, random_path)
        try:
            resp = self.session.get(probe_url, timeout=self.timeout)
            if resp.status_code == 404:
                self.record_check(
                    check_id="B12_404_PAGE_HANDLING",
                    name="Custom 404 Error Page Handling",
                    category="completeness",
                    status="pass",
                    severity="info",
                    finding_type="informational",
                    explanation=f"Server correctly returned HTTP 404 Not Found for non-existent route.",
                    evidence={"testedUrl": probe_url, "statusCode": resp.status_code},
                )
            elif resp.status_code == 200:
                self.record_check(
                    check_id="B12_404_PAGE_HANDLING",
                    name="Custom 404 Error Page Handling",
                    category="completeness",
                    status="fail",
                    severity="medium",
                    finding_type="confirmed",
                    explanation=f"Server returned HTTP 200 OK for non-existent path ('Soft 404').",
                    impact="Search engines will index non-existent or deleted pages, causing indexing pollution.",
                    remediation_summary="Configure server / SPA router to respond with true HTTP 404 status.",
                    evidence={"testedUrl": probe_url, "statusCode": 200, "responseLength": len(resp.text)},
                )
            else:
                self.record_check(
                    check_id="B12_404_PAGE_HANDLING",
                    name="Custom 404 Error Page Handling",
                    category="completeness",
                    status="warning",
                    severity="low",
                    finding_type="suspected",
                    explanation=f"Non-existent path returned unexpected HTTP status {resp.status_code}.",
                    impact="Inconsistent error handling for missing URLs.",
                    remediation_summary="Ensure non-existent routes consistently return 404 Not Found.",
                    evidence={"testedUrl": probe_url, "statusCode": resp.status_code},
                )
        except Exception as e:
            self.record_check(
                check_id="B12_404_PAGE_HANDLING",
                name="Custom 404 Error Page Handling",
                category="completeness",
                status="unknown",
                explanation=f"Error checking 404 handler: {str(e)}",
            )

    # ---------------- Category B: SEO & Discoverability ----------------

    def _check_robots_txt(self):
        robots_url = urllib.parse.urljoin(self.normalized_url, "/robots.txt")
        try:
            resp = self.session.get(robots_url, timeout=self.timeout)
            if resp.status_code == 200:
                has_user_agent = "user-agent:" in resp.text.lower()
                has_sitemap = "sitemap:" in resp.text.lower()
                if has_user_agent:
                    self.record_check(
                        check_id="B13_ROBOTS_TXT",
                        name="Robots.txt Availability and Syntax",
                        category="seo",
                        status="pass",
                        severity="info",
                        finding_type="informational",
                        explanation="Valid /robots.txt discovered with User-agent directives.",
                        evidence={"testedUrl": robots_url, "hasSitemapDirective": has_sitemap, "linesCount": len(resp.text.splitlines())},
                    )
                else:
                    self.record_check(
                        check_id="B13_ROBOTS_TXT",
                        name="Robots.txt Availability and Syntax",
                        category="seo",
                        status="warning",
                        severity="low",
                        finding_type="suspected",
                        explanation="/robots.txt exists but lacks standard 'User-agent:' directives.",
                        impact="Crawlers may not interpret the instructions correctly.",
                        remediation_summary="Ensure /robots.txt contains 'User-agent: *' directives.",
                        evidence={"contentSnippet": resp.text[:200]},
                    )
            elif resp.status_code == 404:
                self.record_check(
                    check_id="B13_ROBOTS_TXT",
                    name="Robots.txt Availability and Syntax",
                    category="seo",
                    status="fail",
                    severity="low",
                    finding_type="confirmed",
                    explanation="No /robots.txt file was found on the server (HTTP 404).",
                    impact="Search engines have no crawl guidance and may index sensitive paths.",
                    remediation_summary="Deploy a /robots.txt specifying User-agent rules and Sitemap location.",
                    remediation_snippet="User-agent: *\nAllow: /\n\nSitemap: https://yourdomain.com/sitemap.xml",
                    evidence={"testedUrl": robots_url},
                )
            else:
                self.record_check(
                    check_id="B13_ROBOTS_TXT",
                    name="Robots.txt Availability and Syntax",
                    category="seo",
                    status="warning",
                    severity="low",
                    finding_type="suspected",
                    explanation=f"/robots.txt returned HTTP {resp.status_code}.",
                    evidence={"statusCode": resp.status_code},
                )
        except Exception as e:
            self.record_check(
                check_id="B13_ROBOTS_TXT",
                name="Robots.txt Availability and Syntax",
                category="seo",
                status="unknown",
                explanation=f"Could not connect to /robots.txt: {str(e)}",
            )

    def _check_sitemap_xml(self):
        sitemap_url = urllib.parse.urljoin(self.normalized_url, "/sitemap.xml")
        try:
            resp = self.session.get(sitemap_url, timeout=self.timeout)
            if resp.status_code == 200:
                is_xml = "<urlset" in resp.text.lower() or "<sitemapindex" in resp.text.lower()
                if is_xml:
                    url_count = len(re.findall(r"<loc>", resp.text, re.I))
                    self.record_check(
                        check_id="B14_SITEMAP_XML",
                        name="Sitemap.xml Availability and Syntax",
                        category="seo",
                        status="pass",
                        severity="info",
                        finding_type="informational",
                        explanation=f"Valid XML sitemap identified with approximately {url_count} URL entries.",
                        evidence={"testedUrl": sitemap_url, "urlCount": url_count},
                    )
                else:
                    self.record_check(
                        check_id="B14_SITEMAP_XML",
                        name="Sitemap.xml Availability and Syntax",
                        category="seo",
                        status="fail",
                        severity="low",
                        finding_type="confirmed",
                        explanation="/sitemap.xml returned HTTP 200 but did not contain valid <urlset> XML.",
                        impact="Search engines cannot parse the sitemap structure.",
                        remediation_summary="Generate a standard XML sitemap adhering to sitemaps.org schema.",
                        evidence={"contentSnippet": resp.text[:200]},
                    )
            elif resp.status_code == 404:
                self.record_check(
                    check_id="B14_SITEMAP_XML",
                    name="Sitemap.xml Availability and Syntax",
                    category="seo",
                    status="fail",
                    severity="low",
                    finding_type="confirmed",
                    explanation="No XML sitemap found at standard /sitemap.xml location (HTTP 404).",
                    impact="Slows down search engine content discovery and URL re-indexing.",
                    remediation_summary="Generate and publish a standard XML sitemap at /sitemap.xml.",
                    evidence={"testedUrl": sitemap_url},
                )
            else:
                self.record_check(
                    check_id="B14_SITEMAP_XML",
                    name="Sitemap.xml Availability and Syntax",
                    category="seo",
                    status="warning",
                    severity="low",
                    finding_type="suspected",
                    explanation=f"/sitemap.xml responded with HTTP status {resp.status_code}.",
                    evidence={"statusCode": resp.status_code},
                )
        except Exception as e:
            self.record_check(
                check_id="B14_SITEMAP_XML",
                name="Sitemap.xml Availability and Syntax",
                category="seo",
                status="unknown",
                explanation=f"Could not reach /sitemap.xml: {str(e)}",
            )

    def _check_security_txt(self):
        well_known_url = urllib.parse.urljoin(self.normalized_url, "/.well-known/security.txt")
        legacy_url = urllib.parse.urljoin(self.normalized_url, "/security.txt")

        found_url = None
        contact_line = None
        for url in [well_known_url, legacy_url]:
            try:
                resp = self.session.get(url, timeout=self.timeout)
                if resp.status_code == 200 and "contact:" in resp.text.lower():
                    found_url = url
                    for line in resp.text.splitlines():
                        if line.lower().startswith("contact:"):
                            contact_line = line.strip()
                            break
                    break
            except Exception:
                pass

        if found_url:
            self.record_check(
                check_id="B15_SECURITY_TXT",
                name="Security.txt Availability (RFC 9116)",
                category="trust",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation=f"RFC 9116 security.txt discovered at '{found_url}'.",
                evidence={"testedUrl": found_url, "contactLine": contact_line},
            )
        else:
            # Informational only: missing security.txt is NOT a critical vulnerability
            self.record_check(
                check_id="B15_SECURITY_TXT",
                name="Security.txt Availability (RFC 9116)",
                category="trust",
                status="info",
                severity="info",
                finding_type="informational",
                explanation="No security.txt file found at /.well-known/security.txt or /security.txt.",
                impact="Security researchers have no standardized contact mechanism to report vulnerabilities.",
                remediation_summary="Create /.well-known/security.txt with Contact email and Expires date.",
                remediation_snippet="Contact: mailto:security@yourdomain.com\nExpires: 2027-12-31T23:59:59.000Z",
                doc_url="https://www.rfc-editor.org/rfc/rfc9116",
                evidence={"testedUrl": well_known_url},
            )

    def _check_page_title(self, soup, html: str):
        title = ""
        if soup and soup.title:
            title = soup.title.get_text(strip=True)
        elif not soup:
            m = re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S)
            if m:
                title = m.group(1).strip()

        if not title:
            self.record_check(
                check_id="B16_PAGE_TITLE",
                name="HTML Page Title Tag & Length",
                category="seo",
                status="fail",
                severity="high",
                finding_type="confirmed",
                explanation="No non-empty <title> tag was found in the document.",
                impact="Severely harms organic search rankings, browser tab display, and social sharing.",
                remediation_summary="Add a descriptive <title> tag (30-60 characters) inside <head>.",
                evidence={"testedUrl": self.normalized_url},
            )
        elif len(title) < 20:
            self.record_check(
                check_id="B16_PAGE_TITLE",
                name="HTML Page Title Tag & Length",
                category="seo",
                status="warning",
                severity="low",
                finding_type="suspected",
                explanation=f"Page title is very brief ({len(title)} chars): '{title}'. Recommended is 30-60 chars.",
                impact="Missed opportunity to target relevant search keywords.",
                remediation_summary="Expand title to between 30 and 60 characters.",
                evidence={"title": title, "characterCount": len(title)},
            )
        elif len(title) > 65:
            self.record_check(
                check_id="B16_PAGE_TITLE",
                name="HTML Page Title Tag & Length",
                category="seo",
                status="warning",
                severity="low",
                finding_type="suspected",
                explanation=f"Page title is excessively long ({len(title)} chars): will be truncated in SERPs.",
                impact="Search engines will truncate the title with ellipses in search results.",
                remediation_summary="Shorten the page title to under 60 characters.",
                evidence={"title": title, "characterCount": len(title)},
            )
        else:
            self.record_check(
                check_id="B16_PAGE_TITLE",
                name="HTML Page Title Tag & Length",
                category="seo",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation=f"Page title declared with optimal length ({len(title)} chars): '{title}'.",
                evidence={"title": title, "characterCount": len(title)},
            )

    def _check_meta_description(self, soup, html: str):
        desc = ""
        if soup:
            m_tag = soup.find("meta", attrs={"name": re.compile(r"^description$", re.I)})
            if m_tag:
                desc = m_tag.get("content", "").strip()

        if not desc:
            self.record_check(
                check_id="B17_META_DESCRIPTION",
                name="Meta Description Presence & Length",
                category="seo",
                status="fail",
                severity="medium",
                finding_type="confirmed",
                explanation="The page lacks a <meta name='description'> tag.",
                impact="Search engines may show random text snippets instead of a compelling description.",
                remediation_summary="Add <meta name='description' content='...'> with 120-160 characters.",
                evidence={"testedUrl": self.normalized_url},
            )
        elif len(desc) < 50:
            self.record_check(
                check_id="B17_META_DESCRIPTION",
                name="Meta Description Presence & Length",
                category="seo",
                status="warning",
                severity="low",
                finding_type="suspected",
                explanation=f"Meta description is short ({len(desc)} characters). Recommended is 120-160 chars.",
                impact="May not provide adequate summary information in search results.",
                remediation_summary="Expand meta description to at least 120 characters.",
                evidence={"descriptionSnippet": desc, "characterCount": len(desc)},
            )
        else:
            self.record_check(
                check_id="B17_META_DESCRIPTION",
                name="Meta Description Presence & Length",
                category="seo",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation=f"Meta description properly configured ({len(desc)} characters).",
                evidence={"characterCount": len(desc), "descriptionSnippet": desc[:100]},
            )

    def _check_h1_headings(self, soup, html: str):
        if not soup:
            return
        h1s = soup.find_all("h1")
        if len(h1s) == 0:
            self.record_check(
                check_id="B18_H1_HEADING",
                name="Main <h1> Heading Hierarchy",
                category="seo",
                status="fail",
                severity="medium",
                finding_type="confirmed",
                explanation="No <h1> heading was found on the page.",
                impact="Impairs content outline comprehension for search bots and screen readers.",
                remediation_summary="Include a single, descriptive <h1> element summarizing the page.",
                evidence={"testedUrl": self.normalized_url},
            )
        elif len(h1s) > 1:
            self.record_check(
                check_id="B18_H1_HEADING",
                name="Main <h1> Heading Hierarchy",
                category="seo",
                status="warning",
                severity="low",
                finding_type="suspected",
                explanation=f"Found {len(h1s)} <h1> elements on the page. Standard best practice is a single <h1>.",
                impact="Multiple <h1> headings can dilute heading hierarchy and keyword prominence.",
                remediation_summary="Use a single <h1> for the page title and <h2>-<h6> for sub-sections.",
                evidence={"h1Count": len(h1s), "h1Texts": [h.get_text(strip=True)[:50] for h in h1s[:3]]},
            )
        else:
            self.record_check(
                check_id="B18_H1_HEADING",
                name="Main <h1> Heading Hierarchy",
                category="seo",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation=f"Single primary <h1> heading found: '{h1s[0].get_text(strip=True)[:60]}'.",
                evidence={"h1Text": h1s[0].get_text(strip=True)[:100]},
            )

    def _check_image_alt_texts(self, soup):
        if not soup:
            return
        images = soup.find_all("img")
        if not images:
            self.record_check(
                check_id="B19_IMAGE_ALT_TEXT",
                name="Image Alt Text Attributes",
                category="accessibility",
                status="not_applicable",
                severity="info",
                finding_type="informational",
                explanation="No image elements found on the page.",
            )
            return

        missing_alt = []
        for img in images:
            alt = img.get("alt")
            src = img.get("src", "unknown")
            if alt is None:
                missing_alt.append(src)

        if missing_alt:
            self.record_check(
                check_id="B19_IMAGE_ALT_TEXT",
                name="Image Alt Text Attributes",
                category="accessibility",
                status="fail",
                severity="medium",
                finding_type="confirmed",
                explanation=f"{len(missing_alt)} of {len(images)} image(s) lack an alt attribute.",
                impact="Screen readers cannot convey image meaning to visually impaired users; harms image SEO.",
                remediation_summary="Add descriptive alt='...' text to all informative <img> tags (or alt='' for decorative).",
                evidence={"totalImages": len(images), "missingAltCount": len(missing_alt), "sample": missing_alt[:3]},
            )
        else:
            self.record_check(
                check_id="B19_IMAGE_ALT_TEXT",
                name="Image Alt Text Attributes",
                category="accessibility",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation=f"All {len(images)} image element(s) have alt attributes.",
                evidence={"totalImages": len(images)},
            )

    def _check_canonical_validity(self, soup):
        if not soup:
            return
        canonical = soup.find("link", rel=re.compile(r"^canonical$", re.I))
        if not canonical or not canonical.get("href"):
            return  # Handled by B11

        href = canonical["href"].strip()
        parsed = urllib.parse.urlsplit(href)
        if not parsed.scheme or not parsed.netloc:
            self.record_check(
                check_id="B20_CANONICAL_REACHABILITY",
                name="Canonical Target Validity",
                category="seo",
                status="warning",
                severity="low",
                finding_type="suspected",
                explanation=f"Canonical URL is relative ('{href}') rather than absolute.",
                impact="Search engines prefer fully-qualified absolute canonical URLs.",
                remediation_summary="Use fully qualified absolute canonical URLs including protocol and domain.",
                evidence={"canonicalHref": href},
            )
        elif parsed.hostname and parsed.hostname.lower() != self.hostname:
            self.record_check(
                check_id="B20_CANONICAL_REACHABILITY",
                name="Canonical Target Validity",
                category="seo",
                status="info",
                severity="info",
                finding_type="informational",
                explanation=f"Cross-domain canonical specified: points to '{parsed.hostname}'.",
                evidence={"targetHost": parsed.hostname},
            )
        else:
            self.record_check(
                check_id="B20_CANONICAL_REACHABILITY",
                name="Canonical Target Validity",
                category="seo",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation="Canonical URL is an absolute, valid link matching the target hostname.",
                evidence={"canonicalUrl": href},
            )

    def _check_http_to_https_redirect(self):
        parsed = urllib.parse.urlsplit(self.normalized_url)
        if parsed.scheme == "http":
            return

        http_url = f"http://{self.hostname}/"
        try:
            resp = self.session.get(http_url, timeout=self.timeout, allow_redirects=False)
            if resp.status_code in (301, 308, 302, 307):
                loc = resp.headers.get("Location", "")
                if loc.startswith("https://"):
                    self.record_check(
                        check_id="B21_HTTP_HTTPS_REDIRECT",
                        name="HTTP to HTTPS Redirect Behavior",
                        category="security",
                        status="pass",
                        severity="info",
                        finding_type="informational",
                        explanation=f"HTTP properly redirects to HTTPS with status {resp.status_code}.",
                        evidence={"httpProbeUrl": http_url, "statusCode": resp.status_code, "location": loc},
                    )
                    return
            self.record_check(
                check_id="B21_HTTP_HTTPS_REDIRECT",
                name="HTTP to HTTPS Redirect Behavior",
                category="security",
                status="fail",
                severity="high",
                finding_type="confirmed",
                explanation=f"HTTP port 80 did not automatically redirect to HTTPS (responded {resp.status_code}).",
                impact="Users entering the plain domain without https:// may communicate in cleartext.",
                remediation_summary="Configure web server to return 301 redirect from HTTP port 80 to HTTPS.",
                remediation_snippet="server {\n    listen 80;\n    server_name example.com;\n    return 301 https://$host$request_uri;\n}",
                evidence={"httpProbeUrl": http_url, "statusCode": resp.status_code},
            )
        except Exception as e:
            self.record_check(
                check_id="B21_HTTP_HTTPS_REDIRECT",
                name="HTTP to HTTPS Redirect Behavior",
                category="security",
                status="unknown",
                explanation=f"Could not connect to HTTP port 80: {str(e)}",
            )

    def _check_mixed_content(self, soup):
        if not self.normalized_url.startswith("https://"):
            self.record_check(
                check_id="B22_MIXED_CONTENT",
                name="Mixed Content Subresource References",
                category="security",
                status="not_applicable",
                severity="info",
                explanation="Target is not hosted on HTTPS; mixed content checks apply only to HTTPS.",
            )
            return

        if not soup:
            return

        insecure = []
        for tag in soup.find_all(["script", "img", "link", "iframe", "audio", "video"]):
            src = tag.get("src") or tag.get("href")
            if src and src.startswith("http://"):
                insecure.append(f"<{tag.name} src='{src}'>")

        if insecure:
            self.record_check(
                check_id="B22_MIXED_CONTENT",
                name="Mixed Content Subresource References",
                category="security",
                status="fail",
                severity="high",
                finding_type="confirmed",
                explanation=f"Identified {len(insecure)} insecure HTTP subresource(s) referenced over HTTPS.",
                impact="Browsers block active mixed content (scripts/iframes); passive content can be snooped.",
                remediation_summary="Update all script, stylesheet, and media URLs to use https:// or relative paths.",
                evidence={"insecureElements": insecure[:3]},
            )
        else:
            self.record_check(
                check_id="B22_MIXED_CONTENT",
                name="Mixed Content Subresource References",
                category="security",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation="No insecure HTTP subresources were detected on the HTTPS page.",
                evidence={"testedUrl": self.normalized_url},
            )

    def _check_html_lang(self, soup, html: str):
        lang = None
        if soup and soup.html:
            lang = soup.html.get("lang")
        elif not soup:
            m = re.search(r"<html[^>]*\blang=['\"]([^'\"]+)['\"]", html, re.I)
            if m:
                lang = m.group(1)

        if lang and lang.strip():
            self.record_check(
                check_id="B23_HTML_LANG",
                name="HTML Language Declaration (lang attribute)",
                category="accessibility",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation=f"Valid HTML lang attribute declared: lang='{lang}'.",
                evidence={"langAttribute": lang},
            )
        else:
            self.record_check(
                check_id="B23_HTML_LANG",
                name="HTML Language Declaration (lang attribute)",
                category="accessibility",
                status="fail",
                severity="low",
                finding_type="confirmed",
                explanation="<html> tag is missing a 'lang' attribute declaration.",
                impact="Screen readers cannot detect document language automatically for speech synthesis.",
                remediation_summary="Add lang attribute to <html> tag (e.g. <html lang='en'>).",
                evidence={"testedUrl": self.normalized_url},
            )

    def _check_indexability_directives(self, resp, soup):
        noindex = False
        reasons = []

        if resp and resp.headers:
            x_robots = resp.headers.get("x-robots-tag", "")
            if "noindex" in x_robots.lower():
                noindex = True
                reasons.append(f"X-Robots-Tag: {x_robots}")

        if soup:
            for meta in soup.find_all("meta", attrs={"name": re.compile(r"robots", re.I)}):
                content = meta.get("content", "").lower()
                if "noindex" in content:
                    noindex = True
                    reasons.append(f"<meta name='robots' content='{content}'>")

        if noindex:
            self.record_check(
                check_id="B24_INDEXABILITY_DIRECTIVES",
                name="Indexability Signals & Robots Directives",
                category="seo",
                status="warning",
                severity="medium",
                finding_type="confirmed",
                explanation="Page contains 'noindex' directive instructing search engines not to index it.",
                impact="Search engines will omit this website entirely from search indices.",
                remediation_summary="Remove 'noindex' if this is a public production website.",
                evidence={"directives": reasons},
            )
        else:
            self.record_check(
                check_id="B24_INDEXABILITY_DIRECTIVES",
                name="Indexability Signals & Robots Directives",
                category="seo",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation="Page is indexable: no blocking 'noindex' directives detected.",
                evidence={"testedUrl": self.normalized_url},
            )

    def _check_structured_data(self, soup, html: str):
        if not soup:
            return

        json_ld_scripts = soup.find_all("script", type=re.compile(r"application/ld\+json", re.I))
        if not json_ld_scripts:
            self.record_check(
                check_id="B25_STRUCTURED_DATA",
                name="Structured Data (Schema.org / JSON-LD)",
                category="seo",
                status="info",
                severity="info",
                finding_type="informational",
                explanation="No Schema.org JSON-LD structured data detected on the page.",
                impact="Structured data enables Google rich snippets (breadcrumbs, organization, products).",
                remediation_summary="Add JSON-LD script blocks declaring Organization, WebSite, or Product schema.",
                evidence={"testedUrl": self.normalized_url},
            )
            return

        valid_types = []
        for s in json_ld_scripts:
            try:
                data = json.loads(s.string or "")
                if isinstance(data, dict):
                    t = data.get("@type", "Unknown")
                    valid_types.append(t)
                elif isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict):
                            valid_types.append(item.get("@type", "Unknown"))
            except Exception:
                pass

        if valid_types:
            self.record_check(
                check_id="B25_STRUCTURED_DATA",
                name="Structured Data (Schema.org / JSON-LD)",
                category="seo",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation=f"Valid JSON-LD structured data found with types: {', '.join(valid_types)}.",
                evidence={"schemaTypes": valid_types, "blocksCount": len(json_ld_scripts)},
            )
        else:
            self.record_check(
                check_id="B25_STRUCTURED_DATA",
                name="Structured Data (Schema.org / JSON-LD)",
                category="seo",
                status="warning",
                severity="low",
                finding_type="suspected",
                explanation="JSON-LD script block exists but contains invalid JSON syntax.",
                impact="Search engines cannot parse malformed structured data blocks.",
                remediation_summary="Validate JSON-LD syntax using Google Rich Results Test tool.",
                evidence={"blocksCount": len(json_ld_scripts)},
            )

    # ---------------- Category C: Performance & Technical Quality ----------------

    def _check_html_size(self, resp):
        if not resp:
            return
        size_bytes = len(resp.content)
        size_kb = size_bytes / 1024

        if size_kb > 500:
            self.record_check(
                check_id="B26_HTML_SIZE",
                name="HTML Document Response Size",
                category="performance",
                status="warning",
                severity="low",
                finding_type="confirmed",
                explanation=f"Raw HTML document size is large ({size_kb:.1f} KB; recommended < 500 KB).",
                impact="Increases time-to-first-byte (TTFB) and main-thread parsing latency.",
                remediation_summary="Minify HTML output and avoid embedding massive inline data/SVG blobs.",
                evidence={"sizeBytes": size_bytes, "sizeKB": round(size_kb, 1)},
            )
        else:
            self.record_check(
                check_id="B26_HTML_SIZE",
                name="HTML Document Response Size",
                category="performance",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation=f"HTML document size is optimal ({size_kb:.1f} KB).",
                evidence={"sizeBytes": size_bytes, "sizeKB": round(size_kb, 1)},
            )

    def _check_resource_counts(self, soup):
        if not soup:
            return
        scripts = len(soup.find_all("script"))
        stylesheets = len(soup.find_all("link", rel=re.compile(r"stylesheet", re.I)))

        if scripts + stylesheets > 50:
            self.record_check(
                check_id="B27_RESOURCE_COUNT",
                name="JavaScript and CSS Resource Count",
                category="performance",
                status="warning",
                severity="low",
                finding_type="suspected",
                explanation=f"High subresource request volume ({scripts} scripts, {stylesheets} stylesheets).",
                impact="Large numbers of render-blocking HTTP requests degrade Core Web Vitals.",
                remediation_summary="Bundle scripts and stylesheets using modern bundlers (Vite/Webpack).",
                evidence={"scriptCount": scripts, "stylesheetCount": stylesheets},
            )
        else:
            self.record_check(
                check_id="B27_RESOURCE_COUNT",
                name="JavaScript and CSS Resource Count",
                category="performance",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation=f"Reasonable subresource count ({scripts} scripts, {stylesheets} stylesheets).",
                evidence={"scriptCount": scripts, "stylesheetCount": stylesheets},
            )

    def _check_image_dimensions(self, soup):
        if not soup:
            return
        images = soup.find_all("img")
        if not images:
            self.record_check(
                check_id="B28_IMAGE_DIMENSIONS",
                name="Image Explicit Dimensions & Responsive Hints",
                category="performance",
                status="not_applicable",
                explanation="No image elements present on page.",
            )
            return

        missing_dims = 0
        for img in images:
            if not img.get("width") or not img.get("height"):
                # Also check style attribute
                style = img.get("style", "")
                if "width" not in style or "height" not in style:
                    missing_dims += 1

        if missing_dims > 0:
            self.record_check(
                check_id="B28_IMAGE_DIMENSIONS",
                name="Image Explicit Dimensions & Responsive Hints",
                category="performance",
                status="warning",
                severity="low",
                finding_type="suspected",
                explanation=f"{missing_dims} image(s) lack explicit width and height attributes.",
                impact="Causes Cumulative Layout Shift (CLS) as images load and reflow content.",
                remediation_summary="Set explicit width and height attributes on <img> tags or reserve aspect-ratio.",
                evidence={"missingDimensionsCount": missing_dims, "totalImages": len(images)},
            )
        else:
            self.record_check(
                check_id="B28_IMAGE_DIMENSIONS",
                name="Image Explicit Dimensions & Responsive Hints",
                category="performance",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation=f"All {len(images)} images have explicit dimensions or aspect ratio defined.",
                evidence={"totalImages": len(images)},
            )

    def _check_resource_compression(self, resp):
        if not resp:
            return
        encoding = resp.headers.get("content-encoding", "").lower()
        if encoding in ("gzip", "br", "zstd", "deflate"):
            self.record_check(
                check_id="B29_RESOURCE_COMPRESSION",
                name="HTTP Resource Compression",
                category="performance",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation=f"Resource compression active: Content-Encoding is '{encoding}'.",
                evidence={"contentEncoding": encoding},
            )
        else:
            self.record_check(
                check_id="B29_RESOURCE_COMPRESSION",
                name="HTTP Resource Compression",
                category="performance",
                status="warning",
                severity="low",
                finding_type="suspected",
                explanation="Server response is uncompressed (no gzip or brotli Content-Encoding header).",
                impact="Uncompressed HTML transmits 3x to 5x more data over the wire.",
                remediation_summary="Enable gzip or brotli compression in your web server / CDN.",
                evidence={"observedEncoding": encoding or "[None]"},
            )

    def _check_static_cache_headers(self, resp):
        if not resp:
            return
        cc = resp.headers.get("cache-control", "")
        etag = resp.headers.get("etag", "")

        if cc or etag:
            self.record_check(
                check_id="B30_CACHE_HEADERS",
                name="Cache Header Configuration",
                category="performance",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation=f"Cache validation headers observed (Cache-Control: '{cc or 'None'}', ETag: '{etag or 'None'}').",
                evidence={"cacheControl": cc, "etag": etag},
            )
        else:
            self.record_check(
                check_id="B30_CACHE_HEADERS",
                name="Cache Header Configuration",
                category="performance",
                status="info",
                severity="info",
                finding_type="informational",
                explanation="Root document response lacks explicit Cache-Control or ETag headers.",
                impact="Browsers may rely on heuristic caching algorithms.",
                remediation_summary="Set explicit Cache-Control headers (e.g. 'no-cache' for HTML, long max-age for static assets).",
                evidence={"testedUrl": self.normalized_url},
            )

    def _check_redirect_chains(self, redirect_history: List[str]):
        hops = len(redirect_history) - 1 if redirect_history else 0
        if hops > 2:
            self.record_check(
                check_id="B31_REDIRECT_CHAINS",
                name="Redirect Chain Length",
                category="performance",
                status="warning",
                severity="low",
                finding_type="confirmed",
                explanation=f"Excessive redirect chain detected ({hops} hops before reaching destination).",
                impact="Each redirect adds DNS and TLS handshake latency before page render starts.",
                remediation_summary="Direct canonical traffic to final destination in a single hop.",
                evidence={"hopCount": hops, "chain": redirect_history},
            )
        else:
            self.record_check(
                check_id="B31_REDIRECT_CHAINS",
                name="Redirect Chain Length",
                category="performance",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation=f"Minimal redirect chain ({hops} hop(s)).",
                evidence={"hopCount": hops, "chain": redirect_history},
            )

    def _check_tls_certificate(self) -> Dict[str, Any]:
        parsed = urllib.parse.urlsplit(self.normalized_url)
        if parsed.scheme != "https":
            self.record_check(
                check_id="B32_TLS_CERT_VALIDITY",
                name="TLS Certificate Validity & HTTPS Configuration",
                category="security",
                status="fail",
                severity="critical",
                finding_type="confirmed",
                explanation="Website is served over plaintext HTTP without TLS encryption.",
                impact="All traffic is unencrypted and vulnerable to eavesdropping and MITM attacks.",
                remediation_summary="Deploy a TLS certificate and migrate website to HTTPS.",
                evidence={"scheme": "http"},
            )
            return {"scheme": "http", "tlsVersion": None, "certValid": False}

        tls_data = {"scheme": "https", "tlsVersion": None, "certValid": False}
        context = ssl.create_default_context()
        port = self.port or 443

        try:
            with socket.create_connection((self.hostname, port), timeout=self.timeout) as sock:
                with context.wrap_socket(sock, server_hostname=self.hostname) as ssock:
                    tls_version = ssock.version()
                    cert = ssock.getpeercert()
                    tls_data["tlsVersion"] = tls_version
                    tls_data["certValid"] = True

                    not_after_str = cert.get("notAfter", "")
                    days_left = 999
                    if not_after_str:
                        not_after = datetime.strptime(not_after_str, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
                        days_left = (not_after - datetime.now(timezone.utc)).days
                        tls_data["certExpiresInDays"] = days_left

                    if days_left < 14:
                        self.record_check(
                            check_id="B32_TLS_CERT_VALIDITY",
                            name="TLS Certificate Validity & HTTPS Configuration",
                            category="security",
                            status="warning",
                            severity="high" if days_left < 7 else "medium",
                            finding_type="confirmed",
                            explanation=f"TLS certificate expires soon ({days_left} days remaining).",
                            impact="Users will see browser certificate warnings once expired.",
                            remediation_summary="Renew the TLS certificate immediately.",
                            evidence={"expiresInDays": days_left, "expiryDate": not_after_str},
                        )
                    else:
                        self.record_check(
                            check_id="B32_TLS_CERT_VALIDITY",
                            name="TLS Certificate Validity & HTTPS Configuration",
                            category="security",
                            status="pass",
                            severity="info",
                            finding_type="informational",
                            explanation=f"Valid TLS certificate negotiating {tls_version} (expires in {days_left} days).",
                            evidence={"tlsVersion": tls_version, "expiresInDays": days_left},
                        )
        except ssl.SSLCertVerificationError as e:
            self.record_check(
                check_id="B32_TLS_CERT_VALIDITY",
                name="TLS Certificate Validity & HTTPS Configuration",
                category="security",
                status="fail",
                severity="critical",
                finding_type="confirmed",
                explanation=f"TLS certificate validation failed: {str(e)}",
                impact="Browsers display full-page security warnings blocking navigation.",
                remediation_summary="Deploy a valid, CA-signed TLS certificate matching the domain.",
                evidence={"error": str(e)},
            )
        except Exception as e:
            self.record_check(
                check_id="B32_TLS_CERT_VALIDITY",
                name="TLS Certificate Validity & HTTPS Configuration",
                category="security",
                status="unknown",
                explanation=f"TLS connection check encountered error: {str(e)}",
            )

        return tls_data

    def _check_mobile_viewport(self, soup, html: str):
        viewport = ""
        if soup:
            v_meta = soup.find("meta", attrs={"name": re.compile(r"^viewport$", re.I)})
            if v_meta:
                viewport = v_meta.get("content", "").strip()

        if viewport and "width=device-width" in viewport.lower():
            self.record_check(
                check_id="B33_VIEWPORT_CONFIG",
                name="Mobile Viewport Configuration",
                category="performance",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation=f"Mobile viewport properly configured: '{viewport}'.",
                evidence={"viewportContent": viewport},
            )
        else:
            self.record_check(
                check_id="B33_VIEWPORT_CONFIG",
                name="Mobile Viewport Configuration",
                category="performance",
                status="fail",
                severity="medium",
                finding_type="confirmed",
                explanation="Missing or improper <meta name='viewport' content='width=device-width, initial-scale=1'>.",
                impact="Mobile devices will render the page scaled down as a desktop layout.",
                remediation_summary="Add <meta name='viewport' content='width=device-width, initial-scale=1'> inside <head>.",
                evidence={"observedViewport": viewport or "[None]"},
            )

    def _check_a11y_landmarks_and_labels(self, soup):
        if not soup:
            return

        landmarks = []
        for tag in ["header", "nav", "main", "footer", "aside"]:
            if soup.find(tag) or soup.find(attrs={"role": tag}):
                landmarks.append(tag)

        # Form labels check
        inputs = soup.find_all("input")
        inputs_missing_labels = 0
        for inp in inputs:
            inp_type = inp.get("type", "text").lower()
            if inp_type in ("hidden", "submit", "button", "reset"):
                continue
            inp_id = inp.get("id")
            has_label = False
            if inp_id and soup.find("label", attrs={"for": inp_id}):
                has_label = True
            elif inp.get("aria-label") or inp.get("aria-labelledby") or inp.get("title"):
                has_label = True
            elif inp.find_parent("label"):
                has_label = True

            if not has_label:
                inputs_missing_labels += 1

        if len(landmarks) >= 2 and inputs_missing_labels == 0:
            self.record_check(
                check_id="B34_A11Y_LANDMARKS_LABELS",
                name="Accessibility Landmarks and Form Labels",
                category="accessibility",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation=f"Semantic landmarks ({', '.join(landmarks)}) and form labels properly configured.",
                evidence={"landmarks": landmarks, "inputsMissingLabels": 0},
            )
        elif inputs_missing_labels > 0:
            self.record_check(
                check_id="B34_A11Y_LANDMARKS_LABELS",
                name="Accessibility Landmarks and Form Labels",
                category="accessibility",
                status="warning",
                severity="low",
                finding_type="suspected",
                explanation=f"{inputs_missing_labels} form input(s) lack an associated <label> or aria-label.",
                impact="Screen reader users cannot understand input purpose.",
                remediation_summary="Associate each form input with a visible <label for='id'> or aria-label.",
                evidence={"landmarks": landmarks, "inputsMissingLabels": inputs_missing_labels},
            )
        else:
            self.record_check(
                check_id="B34_A11Y_LANDMARKS_LABELS",
                name="Accessibility Landmarks and Form Labels",
                category="accessibility",
                status="info",
                severity="info",
                finding_type="informational",
                explanation=f"Document landmarks present: {', '.join(landmarks) if landmarks else 'None'}.",
                evidence={"landmarks": landmarks},
            )
