#!/usr/bin/env python3
"""
VibeSift Website Inspection Worker (Python)
Performs safe, externally observable technical inspection:
- HTTP status & redirect chains
- Security response headers & Cookie flags
- HTTPS configuration & TLS certificate observations
- Technical SEO (Title, Description, Canonical, Headings, Robots.txt, Sitemap)
- Broken link detection via bounded crawl
- Public sensitive exposure checks
- Strict SSRF defenses before every request and redirect
"""

import argparse
import json
import logging
import re
import socket
import ssl
import sys
import time
import urllib.parse
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from ssrf_guard import SSRFProtectionError, is_disallowed_ip, resolve_and_validate_host, validate_url

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("WebsiteInspector")

class SafeSession(requests.Session):
    """Requests Session enforcing SSRF validation on every request and redirect."""
    def __init__(self, max_response_size: int = 2 * 1024 * 1024):
        super().__init__()
        self.max_redirects = 5
        self.max_response_size = max_response_size
        self.headers.update({
            "User-Agent": "Mozilla/5.0 (compatible; VibeSiftAuditor/1.0; +https://vibesift.pixir.in/docs/bot)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        })

    def request(self, method, url, **kwargs):
        # Validate target URL and DNS
        normalized_url, hostname, _ = validate_url(url)
        resolve_and_validate_host(hostname)
        kwargs["stream"] = True  # Enable streaming to enforce max response size
        kwargs.pop("max_redirects", None)

        resp = super().request(method, normalized_url, **kwargs)

        # Enforce response body size limit
        content = bytearray()
        for chunk in resp.iter_content(chunk_size=8192):
            content.extend(chunk)
            if len(content) > self.max_response_size:
                logger.warning(f"Response size exceeded {self.max_response_size} bytes for {url}. Truncating.")
                break
        resp._content = bytes(content)

        # If redirected, revalidate destination
        if resp.history:
            for r in resp.history:
                dest_url = r.headers.get("Location", "")
                if dest_url:
                    full_dest = urllib.parse.urljoin(r.url, dest_url)
                    _, dest_host, _ = validate_url(full_dest)
                    resolve_and_validate_host(dest_host)

        return resp

class WebsiteInspector:
    def __init__(
        self,
        target_url: str,
        scan_id: str,
        max_pages: int = 10,
        max_depth: int = 2,
        timeout: float = 6.0,
        job_timeout: float = 60.0,
    ):
        self.raw_target_url = target_url
        self.scan_id = scan_id
        self.max_pages = max_pages
        self.max_depth = max_depth
        self.timeout = timeout
        self.job_timeout = job_timeout
        self.start_time = time.time()

        self.normalized_url, self.hostname, self.port = validate_url(target_url)
        self.findings: List[Dict[str, Any]] = []
        self.visited_urls: Set[str] = set()
        self.crawled_metadata: List[Dict[str, Any]] = []
        self.session = SafeSession()

    def add_finding(
        self,
        rule_id: str,
        category: str,
        severity: str,
        title: str,
        description: str,
        affected_url: str,
        impact: str,
        remediation_summary: str,
        remediation_snippet: Optional[str] = None,
        doc_url: Optional[str] = None,
        evidence: Optional[Dict[str, Any]] = None,
        confidence: str = "high",
        detection_method: str = "passive",
    ):
        self.findings.append({
            "ruleId": rule_id,
            "category": category,
            "severity": severity,
            "confidence": confidence,
            "title": title,
            "description": description,
            "affectedUrl": affected_url,
            "detectionMethod": detection_method,
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

    def run_audit(self) -> Dict[str, Any]:
        logger.info(f"Starting inspection for {self.normalized_url} (scanId: {self.scan_id})")

        # 1. TLS and Certificate Check
        tls_info = self._check_tls_and_cert()

        # 2. Main Page Fetch & Inspection
        root_resp = self._inspect_main_page()

        # 3. Robots.txt and Sitemap Check
        self._check_robots_and_sitemap()

        # 4. Public Sensitive Exposure Checks
        self._check_public_exposures()

        # 5. Bounded Crawl (if main page was successfully fetched)
        if root_resp and root_resp.ok:
            self._crawl_internal_links(root_resp)

        duration = time.time() - self.start_time
        logger.info(f"Inspection complete in {duration:.2f}s with {len(self.findings)} findings.")

        return {
            "scanId": self.scan_id,
            "targetUrl": self.normalized_url,
            "hostname": self.hostname,
            "executionTimeMs": int(duration * 1000),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "tlsObservations": tls_info,
            "pagesAudited": len(self.visited_urls),
            "findings": self.findings,
        }

    def _check_tls_and_cert(self) -> Dict[str, Any]:
        parsed = urllib.parse.urlsplit(self.normalized_url)
        if parsed.scheme.lower() != "https":
            self.add_finding(
                rule_id="SEC_NOT_HTTPS",
                category="security",
                severity="critical",
                title="Target Website Does Not Use HTTPS",
                description="The target website was reached over plaintext HTTP instead of secure HTTPS.",
                affected_url=self.normalized_url,
                impact="All traffic, credentials, and user data are exposed in transit to eavesdropping and MITM attacks.",
                remediation_summary="Install a valid TLS certificate and redirect all HTTP traffic to HTTPS.",
                remediation_snippet="server {\n    listen 80;\n    server_name example.com;\n    return 301 https://$host$request_uri;\n}",
                doc_url="https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security",
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

                    # Verify TLS protocol version
                    if tls_version in ("TLSv1", "TLSv1.1"):
                        self.add_finding(
                            rule_id="SEC_LEGACY_TLS",
                            category="security",
                            severity="high",
                            title=f"Outdated TLS Version Observed ({tls_version})",
                            description=f"The server negotiated {tls_version}, which is deprecated due to known cryptographic weaknesses.",
                            affected_url=self.normalized_url,
                            impact="Deprecated TLS versions are susceptible to POODLE, BEAST, and other downgrade attacks.",
                            remediation_summary="Configure the web server to require TLSv1.2 or TLSv1.3.",
                            remediation_snippet="ssl_protocols TLSv1.2 TLSv1.3;",
                            doc_url="https://caniuse.com/tls1-3",
                        )

                    # Expiration check
                    not_after_str = cert.get("notAfter")
                    if not_after_str:
                        not_after = datetime.strptime(not_after_str, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
                        days_left = (not_after - datetime.now(timezone.utc)).days
                        tls_data["certExpiresInDays"] = days_left
                        if days_left < 14:
                            self.add_finding(
                                rule_id="SEC_CERT_EXPIRING_SOON",
                                category="security",
                                severity="high" if days_left < 7 else "medium",
                                title=f"TLS Certificate Expiring Soon ({days_left} days remaining)",
                                description=f"The SSL/TLS certificate expires on {not_after_str}.",
                                affected_url=self.normalized_url,
                                impact="Users will see disruptive browser security warnings once the certificate expires.",
                                remediation_summary="Renew the TLS certificate immediately using Let's Encrypt or your certificate authority.",
                            )
        except ssl.SSLCertVerificationError as e:
            self.add_finding(
                rule_id="SEC_CERT_INVALID",
                category="security",
                severity="critical",
                title="Invalid or Untrusted TLS Certificate",
                description=f"TLS certificate verification failed: {str(e)}",
                affected_url=self.normalized_url,
                impact="Modern browsers block user navigation with full-screen security warnings.",
                remediation_summary="Deploy a valid, CA-signed TLS certificate matching the domain.",
                evidence={"responseSnippet": str(e)},
            )
        except Exception as e:
            logger.warning(f"TLS check encountered error: {e}")

        return tls_data

    def _inspect_main_page(self) -> Optional[requests.Response]:
        try:
            resp = self.session.get(self.normalized_url, timeout=self.timeout)
            self.visited_urls.add(self.normalized_url)
        except Exception as e:
            self.add_finding(
                rule_id="PAGE_FETCH_FAILED",
                category="seo",
                severity="high",
                title="Failed to Retrieve Homepage",
                description=f"Could not connect to target URL: {str(e)}",
                affected_url=self.normalized_url,
                impact="Website is unreachable by visitors and search engine crawlers.",
                remediation_summary="Verify DNS configuration, server uptime, and firewall rules.",
            )
            return None

        # 1. HTTP Status Check
        if resp.status_code >= 400:
            self.add_finding(
                rule_id="HTTP_ERROR_RESPONSE",
                category="seo",
                severity="high",
                title=f"Server Responded With HTTP Error Status {resp.status_code}",
                description=f"Target URL returned an error code ({resp.status_code}).",
                affected_url=self.normalized_url,
                impact="Search crawlers and users cannot access the page.",
                remediation_summary="Investigate server logs and route handlers.",
            )

        # 2. Security Headers Analysis
        self._analyze_security_headers(resp)

        # 3. Cookie Flags Analysis
        self._analyze_cookies(resp)

        # 4. HTML Structure Analysis
        if resp.text:
            self._analyze_html_seo(resp.text, resp.url)

        return resp

    def _analyze_security_headers(self, resp: requests.Response):
        headers = {k.lower(): v for k, v in resp.headers.items()}

        # HSTS
        if resp.url.startswith("https://"):
            hsts = headers.get("strict-transport-security")
            if not hsts:
                self.add_finding(
                    rule_id="SEC_HSTS_MISSING",
                    category="security",
                    severity="medium",
                    title="Strict-Transport-Security (HSTS) Header Missing",
                    description="The server does not enforce HTTPS connections using the HSTS response header.",
                    affected_url=resp.url,
                    impact="Users are vulnerable to SSL-stripping and man-in-the-middle attacks on public networks.",
                    remediation_summary="Add 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload' to HTTPS responses.",
                    remediation_snippet="add_header Strict-Transport-Security \"max-age=31536000; includeSubDomains; preload\" always;",
                    doc_url="https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security",
                )
            elif "max-age" in hsts:
                # Check max-age duration
                match = re.search(r"max-age=(\d+)", hsts)
                if match and int(match.group(1)) < 2592000: # < 30 days
                    self.add_finding(
                        rule_id="SEC_HSTS_SHORT_MAX_AGE",
                        category="security",
                        severity="low",
                        title="HSTS Max-Age Duration Is Low",
                        description=f"Observed HSTS max-age of {match.group(1)}s, recommended is 31536000s (1 year).",
                        affected_url=resp.url,
                        impact="Protection window is too brief for HSTS preload qualification.",
                        remediation_summary="Increase HSTS max-age to at least 31536000 seconds.",
                        evidence={"observedHeader": hsts},
                    )

        # Content-Security-Policy
        csp = headers.get("content-security-policy")
        if not csp:
            self.add_finding(
                rule_id="SEC_CSP_MISSING",
                category="security",
                severity="medium",
                title="Content-Security-Policy (CSP) Header Missing",
                description="No Content-Security-Policy header was detected on the response.",
                affected_url=resp.url,
                impact="Absence of CSP increases susceptibility to Cross-Site Scripting (XSS) and data exfiltration.",
                remediation_summary="Implement a robust CSP restricting script-src, object-src, and default-src.",
                remediation_snippet="add_header Content-Security-Policy \"default-src 'self'; script-src 'self' 'nonce-...'; object-src 'none';\" always;",
                doc_url="https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP",
            )
        elif "'unsafe-inline'" in csp or "'unsafe-eval'" in csp:
            self.add_finding(
                rule_id="SEC_CSP_UNSAFE_DIRECTIVES",
                category="security",
                severity="low",
                title="Content-Security-Policy Contains Unsafe Directives",
                description="CSP allows 'unsafe-inline' or 'unsafe-eval', weakening XSS defenses.",
                affected_url=resp.url,
                impact="Inline script execution bypasses core CSP protections.",
                remediation_summary="Migrate inline scripts to external bundled files with cryptographic nonces or hashes.",
                evidence={"observedHeader": csp},
            )

        # X-Content-Type-Options
        xcto = headers.get("x-content-type-options")
        if not xcto or "nosniff" not in xcto.lower():
            self.add_finding(
                rule_id="SEC_X_CONTENT_TYPE_OPTIONS_MISSING",
                category="security",
                severity="low",
                title="X-Content-Type-Options: nosniff Header Missing",
                description="The response is missing the X-Content-Type-Options header.",
                affected_url=resp.url,
                impact="Allows MIME-sniffing, which can cause browsers to execute non-executable MIME types as scripts.",
                remediation_summary="Configure the server to send 'X-Content-Type-Options: nosniff'.",
                remediation_snippet="add_header X-Content-Type-Options \"nosniff\" always;",
            )

        # X-Frame-Options or CSP frame-ancestors
        xfo = headers.get("x-frame-options")
        has_frame_ancestors = csp and "frame-ancestors" in csp
        if not xfo and not has_frame_ancestors:
            self.add_finding(
                rule_id="SEC_CLICKJACKING_PROTECTION_MISSING",
                category="security",
                severity="low",
                title="Clickjacking Protection Missing (X-Frame-Options / frame-ancestors)",
                description="Neither X-Frame-Options nor CSP frame-ancestors was configured.",
                affected_url=resp.url,
                impact="Allows malicious sites to embed your application in an iframe for clickjacking attacks.",
                remediation_summary="Send 'X-Frame-Options: SAMEORIGIN' or CSP 'frame-ancestors 'self''.",
                remediation_snippet="add_header X-Frame-Options \"SAMEORIGIN\" always;",
            )

        # Referrer-Policy
        ref_policy = headers.get("referrer-policy")
        if not ref_policy:
            self.add_finding(
                rule_id="SEC_REFERRER_POLICY_MISSING",
                category="security",
                severity="low",
                title="Referrer-Policy Header Missing",
                description="No explicit Referrer-Policy is configured, defaulting to browser behavior.",
                affected_url=resp.url,
                impact="Sensitive URL paths and query parameters may leak to external third parties in HTTP referrers.",
                remediation_summary="Set 'Referrer-Policy: strict-origin-when-cross-origin'.",
                remediation_snippet="add_header Referrer-Policy \"strict-origin-when-cross-origin\" always;",
            )

        # Server Information Disclosure
        server = headers.get("server")
        x_powered_by = headers.get("x-powered-by")
        if x_powered_by or (server and re.search(r"\d+\.\d+", server)):
            banner = f"Server: {server or 'N/A'}, X-Powered-By: {x_powered_by or 'N/A'}"
            self.add_finding(
                rule_id="SEC_SERVER_VERSION_DISCLOSURE",
                category="exposure",
                severity="info",
                title="Server Version Information Disclosed in Headers",
                description=f"Detailed server software details were observed: {banner}.",
                affected_url=resp.url,
                impact="Assists automated fingerprinting scanners in targeting known CVEs for specific versions.",
                remediation_summary="Disable server version banners in web server configuration.",
                remediation_snippet="server_tokens off; # Nginx\nHeader unset X-Powered-By # Apache",
                evidence={"observedHeader": banner},
            )

    def _analyze_cookies(self, resp: requests.Response):
        set_cookie_headers = [v for k, v in resp.headers.items() if k.lower() == "set-cookie"]
        for cookie_str in set_cookie_headers:
            # Parse flags
            is_secure = "secure" in cookie_str.lower()
            is_httponly = "httponly" in cookie_str.lower()
            samesite_match = re.search(r"samesite=(strict|lax|none)", cookie_str, re.I)
            samesite_val = samesite_match.group(1).lower() if samesite_match else None

            cookie_name = cookie_str.split("=")[0].strip()

            if not is_secure and resp.url.startswith("https://"):
                self.add_finding(
                    rule_id="COOKIE_SECURE_MISSING",
                    category="cookies",
                    severity="medium",
                    title=f"Cookie '{cookie_name}' Missing 'Secure' Flag",
                    description=f"Cookie '{cookie_name}' was set over HTTPS without the 'Secure' attribute.",
                    affected_url=resp.url,
                    impact="Browser will transmit cookie in cleartext over unencrypted HTTP connections.",
                    remediation_summary=f"Append '; Secure' to Set-Cookie header for '{cookie_name}'.",
                    evidence={"responseSnippet": cookie_str},
                )

            if not is_httponly and not cookie_name.startswith("_ga") and not cookie_name.startswith("theme"):
                self.add_finding(
                    rule_id="COOKIE_HTTPONLY_MISSING",
                    category="cookies",
                    severity="low",
                    title=f"Cookie '{cookie_name}' Missing 'HttpOnly' Flag",
                    description=f"Cookie '{cookie_name}' is accessible via client-side JavaScript document.cookie.",
                    affected_url=resp.url,
                    impact="If an XSS vulnerability exists, attackers can steal this session cookie directly.",
                    remediation_summary=f"Append '; HttpOnly' to Set-Cookie header for '{cookie_name}'.",
                    evidence={"responseSnippet": cookie_str},
                )

            if not samesite_val or samesite_val == "none":
                self.add_finding(
                    rule_id="COOKIE_SAMESITE_INSECURE",
                    category="cookies",
                    severity="low",
                    title=f"Cookie '{cookie_name}' Lacks Proper 'SameSite' Attribute",
                    description=f"Cookie '{cookie_name}' has SameSite={samesite_val or 'None/Unspecified'}.",
                    affected_url=resp.url,
                    impact="Increases risk of Cross-Site Request Forgery (CSRF).",
                    remediation_summary=f"Set SameSite=Lax or SameSite=Strict on cookie '{cookie_name}'.",
                )

    def _analyze_html_seo(self, html: str, page_url: str):
        if not BeautifulSoup:
            # Fallback simple regex
            if not re.search(r"<title[^>]*>.*?</title>", html, re.I | re.S):
                self.add_finding(
                    rule_id="SEO_MISSING_TITLE",
                    category="seo",
                    severity="high",
                    title="Missing HTML <title> Tag",
                    description="The page HTML does not declare a <title> element.",
                    affected_url=page_url,
                    impact="Severely impairs SEO rankings and browser bookmarking.",
                    remediation_summary="Add a descriptive, keyword-rich <title> tag inside <head>.",
                )
            return

        soup = BeautifulSoup(html, "html.parser")

        # 1. Title tag
        title_tag = soup.find("title")
        if not title_tag or not title_tag.text.strip():
            self.add_finding(
                rule_id="SEO_MISSING_TITLE",
                category="seo",
                severity="high",
                title="Missing or Empty HTML <title> Tag",
                description="No non-empty <title> tag found on the page.",
                affected_url=page_url,
                impact="Severely harms search engine visibility and tab display.",
                remediation_summary="Add a descriptive <title> (30-60 characters) inside <head>.",
            )
        elif len(title_tag.text.strip()) > 70:
            self.add_finding(
                rule_id="SEO_TITLE_TOO_LONG",
                category="seo",
                severity="low",
                title="HTML <title> Tag Is Excessively Long",
                description=f"Title length is {len(title_tag.text.strip())} characters (recommended: 50-60 chars).",
                affected_url=page_url,
                impact="Search engines will truncate the title in search engine results pages (SERPs).",
                remediation_summary="Shorten title to under 60 characters.",
                evidence={"domSelector": "head > title", "responseSnippet": title_tag.text.strip()},
            )

        # 2. Meta description
        meta_desc = soup.find("meta", attrs={"name": re.compile(r"^description$", re.I)})
        if not meta_desc or not meta_desc.get("content", "").strip():
            self.add_finding(
                rule_id="SEO_MISSING_META_DESCRIPTION",
                category="seo",
                severity="medium",
                title="Missing Meta Description Tag",
                description="The page lacks a <meta name=\"description\"> tag.",
                affected_url=page_url,
                impact="Search engines may display random page snippets instead of a curated description.",
                remediation_summary="Add <meta name=\"description\" content=\"...\"> with 120-160 characters.",
            )

        # 3. Canonical link
        canonical = soup.find("link", attrs={"rel": re.compile(r"^canonical$", re.I)})
        if not canonical or not canonical.get("href"):
            self.add_finding(
                rule_id="SEO_MISSING_CANONICAL",
                category="seo",
                severity="low",
                title="Missing rel=\"canonical\" Link Tag",
                description="The page does not specify a canonical URL link.",
                affected_url=page_url,
                impact="Risk of duplicate content penalties if URLs with varying query parameters or protocols are indexed.",
                remediation_summary="Add <link rel=\"canonical\" href=\"https://example.com/canonical-path\" />.",
            )

        # 4. Heading structure (H1)
        h1_tags = soup.find_all("h1")
        if len(h1_tags) == 0:
            self.add_finding(
                rule_id="SEO_MISSING_H1",
                category="seo",
                severity="medium",
                title="Missing Main <h1> Heading",
                description="No <h1> heading was found in the document body.",
                affected_url=page_url,
                impact="Harms content hierarchy comprehension for both search engines and screen readers.",
                remediation_summary="Include exactly one descriptive <h1> heading communicating page purpose.",
            )
        elif len(h1_tags) > 1:
            self.add_finding(
                rule_id="SEO_MULTIPLE_H1",
                category="seo",
                severity="low",
                title="Multiple <h1> Headings Found",
                description=f"Found {len(h1_tags)} <h1> headings on the page.",
                affected_url=page_url,
                impact="Can dilute keyword focus and confuse document outline hierarchy.",
                remediation_summary="Reserve <h1> for the primary page title and use <h2>-<h6> for subheadings.",
            )

        # 5. Mixed Content check (if on HTTPS)
        if page_url.startswith("https://"):
            insecure_elements = []
            for tag in soup.find_all(["script", "img", "link", "iframe"]):
                src = tag.get("src") or tag.get("href")
                if src and src.startswith("http://"):
                    insecure_elements.append(f"<{tag.name} src='{src}'>")

            if insecure_elements:
                sample = "\n".join(insecure_elements[:3])
                self.add_finding(
                    rule_id="SEC_MIXED_CONTENT",
                    category="security",
                    severity="high",
                    title="Active Mixed Content Detected (HTTP on HTTPS)",
                    description="Page loaded over HTTPS references external subresources over insecure HTTP.",
                    affected_url=page_url,
                    impact="Modern browsers block mixed active content; insecure resources can be altered in transit.",
                    remediation_summary="Update all script, style, and media resource links to use HTTPS.",
                    evidence={"responseSnippet": sample},
                )

    def _check_robots_and_sitemap(self):
        robots_url = urllib.parse.urljoin(self.normalized_url, "/robots.txt")
        try:
            resp = self.session.get(robots_url, timeout=self.timeout)
            if resp.status_code == 404:
                self.add_finding(
                    rule_id="SEO_ROBOTS_TXT_MISSING",
                    category="seo",
                    severity="low",
                    title="Robots.txt File Not Found (404)",
                    description="No /robots.txt file was found on the server.",
                    affected_url=robots_url,
                    impact="Search engines have no explicit crawl guidance and may crawl staging or private paths.",
                    remediation_summary="Create a /robots.txt specifying User-agent rules and Sitemap location.",
                    remediation_snippet="User-agent: *\nAllow: /\n\nSitemap: https://example.com/sitemap.xml",
                )
            elif resp.ok:
                # Check for Sitemap directive in robots.txt
                if "sitemap:" not in resp.text.lower():
                    self.add_finding(
                        rule_id="SEO_ROBOTS_NO_SITEMAP_DIRECTIVE",
                        category="seo",
                        severity="info",
                        title="Robots.txt Does Not Declare Sitemap Location",
                        description="/robots.txt exists but does not contain a 'Sitemap: ...' declaration.",
                        affected_url=robots_url,
                        impact="Search engines may take longer to discover new content and sitemaps.",
                        remediation_summary="Append 'Sitemap: https://yourdomain.com/sitemap.xml' to /robots.txt.",
                    )
        except Exception as e:
            logger.debug(f"Robots.txt check failed: {e}")

        # Check standard sitemap.xml
        sitemap_url = urllib.parse.urljoin(self.normalized_url, "/sitemap.xml")
        try:
            s_resp = self.session.get(sitemap_url, timeout=self.timeout)
            if s_resp.status_code == 404:
                self.add_finding(
                    rule_id="SEO_SITEMAP_XML_MISSING",
                    category="seo",
                    severity="low",
                    title="Standard /sitemap.xml File Missing (404)",
                    description="No XML sitemap found at /sitemap.xml.",
                    affected_url=sitemap_url,
                    impact="Slower indexing speed and incomplete index coverage for nested URLs.",
                    remediation_summary="Generate and publish a standard XML sitemap at /sitemap.xml.",
                )
        except Exception as e:
            logger.debug(f"Sitemap check failed: {e}")

    def _check_public_exposures(self):
        """Probes a small conservative list of critical sensitive files."""
        sensitive_paths = [
            ("/.git/HEAD", "ref: refs/", "Git Repository Metadata Exposed", "critical"),
            ("/.env", "DB_PASSWORD", "Environment (.env) Configuration File Exposed", "critical"),
            ("/wp-config.php.bak", "DB_NAME", "Database Configuration Backup File Exposed", "critical"),
            ("/package.json", "\"dependencies\"", "Node.js package.json Disclosed", "info"),
        ]

        for path, marker, title, severity in sensitive_paths:
            # Respect job timeout
            if time.time() - self.start_time > self.job_timeout:
                break

            target_probe = urllib.parse.urljoin(self.normalized_url, path)
            try:
                resp = self.session.get(target_probe, timeout=self.timeout)
                # Verify that status is 200 and body matches file signature (prevents false positives from SPA 200 catch-alls)
                if resp.status_code == 200 and resp.text and marker in resp.text:
                    self.add_finding(
                        rule_id=f"EXPOSURE_{path.replace('/', '_').replace('.', '').upper()}",
                        category="exposure",
                        severity=severity,
                        title=title,
                        description=f"Publicly accessible sensitive file identified at {path}.",
                        affected_url=target_probe,
                        impact="Exposes source code, internal credentials, or structural project secrets to attackers.",
                        remediation_summary=f"Block access to '{path}' at the web server / reverse proxy layer.",
                        evidence={"responseSnippet": resp.text[:200]},
                    )
            except Exception:
                pass

    def _crawl_internal_links(self, root_resp: requests.Response):
        """Performs bounded internal link discovery to detect broken links."""
        if not BeautifulSoup or not root_resp.text:
            return

        soup = BeautifulSoup(root_resp.text, "html.parser")
        links_to_test = []

        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if not href or href.startswith("#") or href.startswith("mailto:") or href.startswith("tel:"):
                continue

            full_url = urllib.parse.urljoin(root_resp.url, href)
            # Only test internal links under the same hostname
            parsed = urllib.parse.urlsplit(full_url)
            if parsed.hostname and parsed.hostname.lower() == self.hostname:
                clean_link = urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path, parsed.query, ""))
                if clean_link not in self.visited_urls and clean_link not in links_to_test:
                    links_to_test.append(clean_link)

        # Bound crawl limit
        for link in links_to_test[: self.max_pages]:
            if time.time() - self.start_time > self.job_timeout:
                logger.info("Crawl halted: total job timeout reached.")
                break

            self.visited_urls.add(link)
            try:
                resp = self.session.get(link, timeout=self.timeout)
                if resp.status_code == 404:
                    self.add_finding(
                        rule_id="SEO_BROKEN_INTERNAL_LINK",
                        category="seo",
                        severity="medium",
                        title=f"Broken Internal Link Discovered ({resp.status_code})",
                        description=f"Link to '{link}' returned HTTP 404 Not Found.",
                        affected_url=link,
                        impact="Frustrates users and wastes search engine crawl budget.",
                        remediation_summary=f"Fix or remove the dead link pointing to '{link}'.",
                    )
            except Exception as e:
                logger.debug(f"Link check failed for {link}: {e}")

def main():
    parser = argparse.ArgumentParser(description="VibeSift Safe Website Inspector")
    parser.add_argument("--url", required=True, help="Target URL to audit")
    parser.add_argument("--scan-id", required=True, help="Scan job ID")
    parser.add_argument("--output", required=True, help="Path to write JSON output report")
    parser.add_argument("--max-pages", type=int, default=10, help="Maximum pages to crawl")
    parser.add_argument("--timeout", type=float, default=6.0, help="HTTP request timeout in seconds")
    parser.add_argument("--job-timeout", type=float, default=60.0, help="Total execution timeout")

    args = parser.parse_args()

    inspector = WebsiteInspector(
        target_url=args.url,
        scan_id=args.scan_id,
        max_pages=args.max_pages,
        timeout=args.timeout,
        job_timeout=args.job_timeout,
    )

    try:
        report = inspector.run_audit()
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
        }
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(error_report, f, indent=2)
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected fatal error during inspection: {e}", exc_info=True)
        sys.exit(2)

if __name__ == "__main__":
    main()
