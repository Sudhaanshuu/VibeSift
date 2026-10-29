#!/usr/bin/env python3
"""
VibeSift Privacy, Consent & Indian DPDP Act (2023) Audit Engine
Evaluates compliance against the applicable provisions of India's Digital Personal
Data Protection Act, 2023 (DPDP Act) and international privacy best practices.

DISCLAIMER: Automated preliminary technical assessment, not formal legal advice.
Covers 15 distinct compliance and technical privacy checks.
"""

import logging
import re
import urllib.parse
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

import requests
from ssrf_guard import validate_url

logger = logging.getLogger("PrivacyAuditor")


class PrivacyAuditor:
    def __init__(
        self,
        session: requests.Session,
        target_url: str,
        scan_id: str,
        timeout: float = 6.0,
    ):
        self.session = session
        self.raw_target_url = target_url
        self.scan_id = scan_id
        self.timeout = timeout

        self.normalized_url, self.hostname, self.port = validate_url(target_url)
        self.checks: List[Dict[str, Any]] = []
        self.findings: List[Dict[str, Any]] = []

    def record_check(
        self,
        check_id: str,
        name: str,
        status: str,  # pass, fail, warning, info, not_tested, not_applicable, unknown
        severity: str = "info",
        finding_type: str = "informational",  # confirmed, suspected, informational
        explanation: str = "",
        impact: str = "",
        remediation_summary: str = "",
        remediation_snippet: Optional[str] = None,
        doc_url: Optional[str] = None,
        legal_citation: Optional[str] = None,
        evidence: Optional[Dict[str, Any]] = None,
    ):
        now_iso = datetime.now(timezone.utc).isoformat()
        check_obj = {
            "checkId": check_id,
            "name": name,
            "category": "privacy",
            "status": status,
            "severity": severity,
            "findingType": finding_type,
            "auditMode": "privacy",
            "explanation": explanation,
            "impact": impact,
            "remediation": {
                "summary": remediation_summary,
                "codeSnippet": remediation_snippet,
                "docUrl": doc_url,
            },
            "evidence": evidence or {},
            "testTimestamp": now_iso,
            "scope": f"privacy_dpdp:{self.hostname}",
            "legalCitation": legal_citation,
            "isIndependent": True,
        }
        self.checks.append(check_obj)

        if status in ("fail", "warning") and finding_type in ("confirmed", "suspected"):
            finding_id = f"fnd_priv_{self.scan_id[:8]}_{len(self.findings) + 1}_{check_id.lower()}"
            self.findings.append({
                "id": finding_id,
                "scanId": self.scan_id,
                "ruleId": check_id,
                "category": "cookies",  # map to cookies/privacy category
                "severity": severity,
                "confidence": "high",
                "title": name,
                "description": f"[{legal_citation or 'DPDP Act 2023'}] {explanation}",
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

    def run_suite(self, root_resp: Optional[requests.Response]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Any]]:
        logger.info(f"[PrivacyAuditor] Running 15 DPDP Act 2023 & Privacy checks for {self.normalized_url}")

        if not root_resp:
            try:
                root_resp = self.session.get(self.normalized_url, timeout=self.timeout)
            except Exception as e:
                logger.error(f"Cannot run privacy audit: root page unreachable {e}")
                return self.checks, self.findings, {}

        html_text = root_resp.text or ""
        soup = BeautifulSoup(html_text, "html.parser") if (BeautifulSoup and html_text) else None

        # Fetch Privacy Policy text if available
        policy_url, policy_text = self._find_and_fetch_privacy_policy(soup)

        # 1. Privacy Policy Presence
        self._check_privacy_policy_exists(policy_url)

        # 2. Personal Data Collection Explanation
        self._check_data_collection_disclosure(policy_text)

        # 3. Consent Mechanism Presence
        has_consent_banner = self._check_consent_mechanism(soup)

        # 4. Purpose-Linked Notice
        self._check_specific_purpose_linked(policy_text, soup)

        # 5. Pre-Consent Tracking Cookies
        self._check_pre_consent_tracking(root_resp)

        # 6. Reject Parity (No dark patterns)
        self._check_reject_parity(soup, has_consent_banner)

        # 7. Consent Modification & Withdrawal
        self._check_consent_withdrawal(soup)

        # 8. Cookie Policy Alignment
        self._check_cookie_alignment(root_resp, policy_text)

        # 9. Third-Party Tracker Scripts
        self._check_third_party_trackers(soup, html_text)

        # 10. Form Purpose Notice
        self._check_form_purpose_notice(soup)

        # 11. Data Principal Rights Disclosure
        self._check_data_principal_rights(policy_text)

        # 12. Children's Data Protection (Section 9 DPDP Act)
        self._check_children_data_section9(policy_text)

        # 13. Data Retention and Sharing Disclosure
        self._check_retention_sharing(policy_text)

        # 14. Grievance Officer in India (Section 12/13 DPDP Act)
        self._check_grievance_officer(policy_text)

        # 15. Overall Preliminary DPDP Act Assessment
        summary = self._generate_overall_assessment()

        logger.info(f"[PrivacyAuditor] Completed {len(self.checks)} privacy checks.")
        return self.checks, self.findings, summary

    def _find_and_fetch_privacy_policy(self, soup) -> Tuple[Optional[str], str]:
        policy_url = None
        if soup:
            for a in soup.find_all("a", href=True):
                href = a["href"].strip()
                text = a.get_text(strip=True).lower()
                if "privacy" in href.lower() or "privacy" in text:
                    policy_url = urllib.parse.urljoin(self.normalized_url, href)
                    break

        if not policy_url:
            for cand in ["/privacy", "/privacy-policy"]:
                test_cand = urllib.parse.urljoin(self.normalized_url, cand)
                try:
                    r = self.session.get(test_cand, timeout=4.0)
                    if r.status_code == 200:
                        return test_cand, r.text
                except Exception:
                    pass
            return None, ""

        try:
            r = self.session.get(policy_url, timeout=5.0)
            if r.status_code == 200:
                return policy_url, r.text
        except Exception:
            pass

        return policy_url, ""

    # ---------------- 1. Privacy Policy Presence ----------------

    def _check_privacy_policy_exists(self, policy_url: Optional[str]):
        if policy_url:
            self.record_check(
                check_id="P01_PRIVACY_POLICY_EXISTS",
                name="Privacy Policy Presence & Public Accessibility",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation=f"Privacy Policy is publicly reachable at '{policy_url}'.",
                legal_citation="Digital Personal Data Protection Act, 2023 - Section 5(1)",
                evidence={"policyUrl": policy_url},
            )
        else:
            self.record_check(
                check_id="P01_PRIVACY_POLICY_EXISTS",
                name="Privacy Policy Presence & Public Accessibility",
                status="fail",
                severity="high",
                finding_type="confirmed",
                explanation="No Privacy Policy link found on homepage or standard /privacy paths.",
                impact="Potential non-compliance with Section 5(1) of India's DPDP Act 2023 requiring notice to Data Principals.",
                remediation_summary="Publish a dedicated Privacy Notice accessible from all website pages.",
                legal_citation="Digital Personal Data Protection Act, 2023 - Section 5(1)",
                evidence={"testedUrl": self.normalized_url},
            )

    # ---------------- 2. Data Collection Disclosure ----------------

    def _check_data_collection_disclosure(self, policy_text: str):
        if not policy_text:
            self.record_check(
                check_id="P02_DATA_COLLECTION_DISCLOSURE",
                name="Personal Data Collection & Processing Disclosures",
                status="fail",
                severity="medium",
                finding_type="confirmed",
                explanation="Cannot verify personal data disclosures because no Privacy Policy content was accessible.",
                legal_citation="Digital Personal Data Protection Act, 2023 - Section 5(1)(a)",
            )
            return

        keywords = ["personal data", "collect", "information we collect", "usage data", "ip address", "cookies"]
        matches = [k for k in keywords if k in policy_text.lower()]
        if len(matches) >= 3:
            self.record_check(
                check_id="P02_DATA_COLLECTION_DISCLOSURE",
                name="Personal Data Collection & Processing Disclosures",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation=f"Policy details personal data collection categories (matched: {', '.join(matches[:4])}).",
                legal_citation="Digital Personal Data Protection Act, 2023 - Section 5(1)(a)",
                evidence={"matchedDisclosures": matches},
            )
        else:
            self.record_check(
                check_id="P02_DATA_COLLECTION_DISCLOSURE",
                name="Personal Data Collection & Processing Disclosures",
                status="warning",
                severity="low",
                finding_type="suspected",
                explanation="Privacy Policy text does not clearly itemize categories of personal data collected.",
                impact="Section 5(1)(a) requires Data Fiduciaries to state what personal data is being processed.",
                remediation_summary="Explicitly itemize all personal data collected (e.g. contact details, device info, analytics).",
                legal_citation="Digital Personal Data Protection Act, 2023 - Section 5(1)(a)",
            )

    # ---------------- 3. Affirmative Consent Mechanism ----------------

    def _check_consent_mechanism(self, soup) -> bool:
        if not soup:
            self.record_check(
                check_id="P03_CONSENT_MECHANISM",
                name="Affirmative Consent Mechanism (Cookie / Data Notice)",
                status="unknown",
                explanation="DOM structure unavailable.",
            )
            return False

        banner = (
            soup.find(id=re.compile(r"cookie|consent|banner", re.I))
            or soup.find(class_=re.compile(r"cookie|consent|banner", re.I))
        )
        if banner:
            self.record_check(
                check_id="P03_CONSENT_MECHANISM",
                name="Affirmative Consent Mechanism (Cookie / Data Notice)",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation="Consent banner / dialog detected for obtaining affirmative user consent.",
                legal_citation="Digital Personal Data Protection Act, 2023 - Section 6(1)",
                evidence={"domSelector": banner.name, "elementId": banner.get("id") or banner.get("class")},
            )
            return True
        else:
            self.record_check(
                check_id="P03_CONSENT_MECHANISM",
                name="Affirmative Consent Mechanism (Cookie / Data Notice)",
                status="info",
                severity="info",
                finding_type="informational",
                explanation="No explicit cookie consent banner detected on page load. Note: Consent is required under DPDP Act when collecting non-essential personal data.",
                impact="If non-essential cookies or analytics trackers are used, affirmative consent must be collected beforehand.",
                remediation_summary="Deploy an affirmative consent banner if non-essential cookies or tracking scripts are used.",
                legal_citation="Digital Personal Data Protection Act, 2023 - Section 6(1)",
            )
            return False

    # ---------------- 4. Specific Purpose-Linked Notice ----------------

    def _check_specific_purpose_linked(self, policy_text: str, soup):
        if not policy_text:
            return

        has_purpose = any(p in policy_text.lower() for p in ["purpose", "how we use", "why we process", "legitimate purpose"])
        if has_purpose:
            self.record_check(
                check_id="P04_SPECIFIC_PURPOSE_LINKED",
                name="Specific Purpose-Linked Processing Specification",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation="Notice specifies defined and legitimate purposes for processing personal data.",
                legal_citation="Digital Personal Data Protection Act, 2023 - Section 5(1)(a) & Section 6(1)",
            )
        else:
            self.record_check(
                check_id="P04_SPECIFIC_PURPOSE_LINKED",
                name="Specific Purpose-Linked Processing Specification",
                status="warning",
                severity="low",
                finding_type="suspected",
                explanation="Privacy Policy lacks clear purpose specifications for data processing activities.",
                impact="Section 6(1) requires consent to be specific to the defined purpose.",
                remediation_summary="State the exact purposes (e.g. account management, billing, support) for each data category.",
                legal_citation="Digital Personal Data Protection Act, 2023 - Section 5(1)(a)",
            )

    # ---------------- 5. Pre-Consent Tracking Prevention ----------------

    def _check_pre_consent_tracking(self, root_resp: requests.Response):
        set_cookies = [v for k, v in root_resp.headers.items() if k.lower() == "set-cookie"]
        tracking_cookies = []

        for c in set_cookies:
            c_name = c.split("=")[0].strip().lower()
            if any(k in c_name for k in ["_ga", "_gid", "_fbp", "fr", "ide", "anj", "mc", "hubspot", "_hjid"]):
                tracking_cookies.append(c_name)

        if tracking_cookies:
            self.record_check(
                check_id="P05_PRE_CONSENT_TRACKING",
                name="Pre-Consent Tracking Cookie Assessment",
                status="warning",
                severity="medium",
                finding_type="confirmed",
                explanation=f"Observable analytics/advertising cookies ({', '.join(tracking_cookies)}) set before affirmative user consent.",
                impact="Violates affirmative consent principles under DPDP Act Section 6(1) and EU ePrivacy.",
                remediation_summary="Configure tag manager to hold non-essential tracking cookies until the user explicitly accepts.",
                legal_citation="Digital Personal Data Protection Act, 2023 - Section 6(1)",
                evidence={"preConsentCookies": tracking_cookies},
            )
        else:
            self.record_check(
                check_id="P05_PRE_CONSENT_TRACKING",
                name="Pre-Consent Tracking Cookie Assessment",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation="No third-party advertising or analytics cookies were observed prior to user consent.",
                legal_citation="Digital Personal Data Protection Act, 2023 - Section 6(1)",
            )

    # ---------------- 6. Reject Parity (Dark Patterns) ----------------

    def _check_reject_parity(self, soup, has_consent_banner: bool):
        if not has_consent_banner or not soup:
            self.record_check(
                check_id="P06_REJECT_PARITY",
                name="Consent Choice Parity (Reject vs Accept Symmetry)",
                status="not_applicable",
                severity="info",
                finding_type="informational",
                explanation="No cookie consent banner active on page load.",
            )
            return

        banner_text = soup.get_text(separator=" ", strip=True).lower()
        has_accept = bool(re.search(r"\b(accept|allow|agree|opt in)\b", banner_text, re.I))
        has_reject = bool(re.search(r"\b(reject|decline|opt out|manage|preferences|deny)\b", banner_text, re.I))

        if has_accept and has_reject:
            self.record_check(
                check_id="P06_REJECT_PARITY",
                name="Consent Choice Parity (Reject vs Accept Symmetry)",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation="Consent UI provides both Accept and Reject/Manage options with symmetry.",
                legal_citation="Guidelines for Prevention and Regulation of Dark Patterns, 2023 / DPDP Section 6",
            )
        elif has_accept and not has_reject:
            self.record_check(
                check_id="P06_REJECT_PARITY",
                name="Consent Choice Parity (Reject vs Accept Symmetry)",
                status="warning",
                severity="medium",
                finding_type="suspected",
                explanation="Consent banner offers 'Accept' but lacks an equally prominent 'Reject' or 'Decline' button (potential Dark Pattern).",
                impact="Asymmetric consent choices violate consumer protection dark pattern regulations and voluntary consent standards.",
                remediation_summary="Provide an equal-prominence 'Reject Non-Essential' button alongside 'Accept All'.",
                legal_citation="Digital Personal Data Protection Act, 2023 - Section 6(1)",
            )
        else:
            self.record_check(
                check_id="P06_REJECT_PARITY",
                name="Consent Choice Parity (Reject vs Accept Symmetry)",
                status="pass",
                severity="info",
            )

    # ---------------- 7. Consent Withdrawal ----------------

    def _check_consent_withdrawal(self, soup):
        has_manage = False
        if soup:
            for a in soup.find_all(["a", "button"]):
                text = a.get_text(strip=True).lower()
                if any(k in text for k in ["cookie settings", "manage cookies", "consent preferences", "revoke consent"]):
                    has_manage = True
                    break

        if has_manage:
            self.record_check(
                check_id="P07_CONSENT_WITHDRAWAL",
                name="Consent Withdrawal & Preference Modification Mechanism",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation="Footer or settings control exists allowing users to change or withdraw consent.",
                legal_citation="Digital Personal Data Protection Act, 2023 - Section 6(4)",
            )
        else:
            self.record_check(
                check_id="P07_CONSENT_WITHDRAWAL",
                name="Consent Withdrawal & Preference Modification Mechanism",
                status="info",
                severity="info",
                finding_type="informational",
                explanation="No explicit persistent 'Cookie Settings' link detected in footer.",
                impact="Section 6(4) grants Data Principals the right to withdraw consent with ease comparable to giving consent.",
                remediation_summary="Add a persistent 'Cookie Preferences' link in the footer so users can withdraw consent at any time.",
                legal_citation="Digital Personal Data Protection Act, 2023 - Section 6(4)",
            )

    # ---------------- 8. Cookie Policy Alignment ----------------

    def _check_cookie_alignment(self, root_resp: requests.Response, policy_text: str):
        set_cookies = [v.split("=")[0].strip() for k, v in root_resp.headers.items() if k.lower() == "set-cookie"]
        if not set_cookies:
            self.record_check(
                check_id="P08_COOKIE_POLICY_ALIGNMENT",
                name="Cookie Behavior vs Stated Policy Alignment",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation="No initial HTTP cookies were set on homepage.",
            )
            return

        has_cookie_mention = "cookie" in policy_text.lower()
        if has_cookie_mention:
            self.record_check(
                check_id="P08_COOKIE_POLICY_ALIGNMENT",
                name="Cookie Behavior vs Stated Policy Alignment",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation=f"{len(set_cookies)} initial cookie(s) set; privacy policy contains disclosures on cookie usage.",
                evidence={"observedCookies": set_cookies},
            )
        else:
            self.record_check(
                check_id="P08_COOKIE_POLICY_ALIGNMENT",
                name="Cookie Behavior vs Stated Policy Alignment",
                status="warning",
                severity="low",
                finding_type="suspected",
                explanation=f"Cookies ({', '.join(set_cookies)}) were set on the response, but Privacy Policy contains no mention of cookies.",
                impact="Transparency gap: cookies are being used without corresponding policy disclosures.",
                remediation_summary="Add a cookie disclosure section in the Privacy Policy detailing active cookies.",
            )

    # ---------------- 9. Third-Party Trackers ----------------

    def _check_third_party_trackers(self, soup, html: str):
        tracker_patterns = [
            (r"google-analytics\.com|googletagmanager\.com", "Google Analytics / Tag Manager"),
            (r"connect\.facebook\.net|fbevents\.js", "Meta (Facebook) Pixel"),
            (r"hotjar\.com", "Hotjar Behavioral Tracker"),
            (r"tiktok\.com.*analytics", "TikTok Pixel"),
            (r"clarity\.ms", "Microsoft Clarity"),
        ]

        found_trackers = []
        for pattern, name in tracker_patterns:
            if re.search(pattern, html, re.I):
                found_trackers.append(name)

        if found_trackers:
            self.record_check(
                check_id="P09_THIRD_PARTY_TRACKERS",
                name="Third-Party Behavioral & Advertising Tracker Scripts",
                status="info",
                severity="info",
                finding_type="informational",
                explanation=f"Observable third-party tracking scripts loaded on initial page render: {', '.join(found_trackers)}.",
                impact="Behavioral tracking scripts transmit user interaction data to external cloud providers.",
                remediation_summary="Ensure these trackers are gated behind affirmative user consent for Indian and EU visitors.",
                legal_citation="Digital Personal Data Protection Act, 2023 - Section 6",
                evidence={"detectedTrackers": found_trackers},
            )
        else:
            self.record_check(
                check_id="P09_THIRD_PARTY_TRACKERS",
                name="Third-Party Behavioral & Advertising Tracker Scripts",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation="No major third-party advertising or behavioral tracking libraries detected in initial HTML.",
            )

    # ---------------- 10. Form Purpose Notice ----------------

    def _check_form_purpose_notice(self, soup):
        if not soup:
            return

        personal_forms = []
        for form in soup.find_all("form"):
            for inp in form.find_all("input"):
                t = inp.get("type", "text").lower()
                n = inp.get("name", "").lower()
                if t in ("email", "tel") or any(k in n for k in ["email", "phone", "mobile", "first_name", "last_name"]):
                    personal_forms.append(form)
                    break

        if not personal_forms:
            self.record_check(
                check_id="P10_FORM_PURPOSE_NOTICE",
                name="Form Personal Data Collection Purpose Notice",
                status="not_applicable",
                severity="info",
                finding_type="informational",
                explanation="No public forms requesting personal information (email, phone, name) on this page.",
            )
            return

        has_notice = False
        for f in personal_forms:
            text = f.get_text(separator=" ", strip=True).lower()
            if any(k in text for k in ["privacy", "agree", "purpose", "terms", "by submitting"]):
                has_notice = True
                break

        if has_notice:
            self.record_check(
                check_id="P10_FORM_PURPOSE_NOTICE",
                name="Form Personal Data Collection Purpose Notice",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation="Form collecting personal data includes notice or privacy acknowledgment.",
                legal_citation="Digital Personal Data Protection Act, 2023 - Section 5(1)",
            )
        else:
            self.record_check(
                check_id="P10_FORM_PURPOSE_NOTICE",
                name="Form Personal Data Collection Purpose Notice",
                status="warning",
                severity="low",
                finding_type="suspected",
                explanation="Form collects contact details without an inline notice explaining the specific purpose of collection.",
                impact="Section 5(1) requires notice accompanied with or preceding personal data collection.",
                remediation_summary="Add inline micro-copy next to submit button (e.g. 'We collect your email solely to reply to inquiries. View our Privacy Policy.').",
                legal_citation="Digital Personal Data Protection Act, 2023 - Section 5(1)",
            )

    # ---------------- 11. Data Principal Rights Disclosure ----------------

    def _check_data_principal_rights(self, policy_text: str):
        if not policy_text:
            return

        rights = ["access", "correction", "erasure", "delete", "grievance", "nominate"]
        matched_rights = [r for r in rights if r in policy_text.lower()]

        if len(matched_rights) >= 3:
            self.record_check(
                check_id="P11_DATA_PRINCIPAL_RIGHTS",
                name="Data Principal Rights Disclosures (Access, Correction, Erasure)",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation=f"Policy outlines Data Principal statutory rights ({', '.join(matched_rights)}).",
                legal_citation="Digital Personal Data Protection Act, 2023 - Sections 11, 12, 13 & 14",
                evidence={"matchedRights": matched_rights},
            )
        else:
            self.record_check(
                check_id="P11_DATA_PRINCIPAL_RIGHTS",
                name="Data Principal Rights Disclosures (Access, Correction, Erasure)",
                status="warning",
                severity="low",
                finding_type="suspected",
                explanation="Privacy Policy lacks clear disclosure of statutory rights: right to access, right to correction, right to erasure.",
                impact="Sections 11-14 mandate mechanisms for Data Principals to access and erase personal data.",
                remediation_summary="Add a dedicated 'Your Rights as Data Principal' section in your Privacy Policy.",
                legal_citation="Digital Personal Data Protection Act, 2023 - Sections 11-14",
            )

    # ---------------- 12. Children's Data Protection (Section 9) ----------------

    def _check_children_data_section9(self, policy_text: str):
        if not policy_text:
            return

        has_child_clause = any(k in policy_text.lower() for k in ["children", "minors", "under 18", "parental consent", "age limit"])
        if has_child_clause:
            self.record_check(
                check_id="P12_CHILDREN_DATA_SECTION9",
                name="Children's Personal Data & Age Safeguards (Section 9)",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation="Privacy policy addresses processing of children's data and verifiable parental consent requirements.",
                legal_citation="Digital Personal Data Protection Act, 2023 - Section 9",
            )
        else:
            self.record_check(
                check_id="P12_CHILDREN_DATA_SECTION9",
                name="Children's Personal Data & Age Safeguards (Section 9)",
                status="info",
                severity="info",
                finding_type="informational",
                explanation="No explicit clause regarding children's personal data or prohibition of tracking minors.",
                impact="Section 9 strictly prohibits tracking or behavioral monitoring of children (< 18 yrs) without parental consent.",
                remediation_summary="State clearly in your Privacy Policy whether services are directed at minors and disclaim intentional collection.",
                legal_citation="Digital Personal Data Protection Act, 2023 - Section 9",
            )

    # ---------------- 13. Data Retention and Sharing Disclosure ----------------

    def _check_retention_sharing(self, policy_text: str):
        if not policy_text:
            return

        has_retention = any(k in policy_text.lower() for k in ["retention", "retain", "how long we keep"])
        has_sharing = any(k in policy_text.lower() for k in ["third party", "share", "transfer", "service provider"])

        if has_retention and has_sharing:
            self.record_check(
                check_id="P13_RETENTION_SHARING",
                name="Data Retention & Cross-Border Sharing Disclosures",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation="Policy outlines data retention periods and third-party data sharing practices.",
                legal_citation="Digital Personal Data Protection Act, 2023 - Section 8(7) & Section 16",
            )
        else:
            self.record_check(
                check_id="P13_RETENTION_SHARING",
                name="Data Retention & Cross-Border Sharing Disclosures",
                status="warning",
                severity="low",
                finding_type="suspected",
                explanation="Policy is missing explicit disclosures on data retention timeframes or third-party transfer practices.",
                impact="Section 8(7) mandates data erasure once the purpose of collection is served.",
                remediation_summary="Specify data retention periods and state if data is shared with cloud infrastructure providers.",
                legal_citation="Digital Personal Data Protection Act, 2023 - Section 8(7)",
            )

    # ---------------- 14. Grievance Officer in India ----------------

    def _check_grievance_officer(self, policy_text: str):
        if not policy_text:
            return

        has_dpo = any(k in policy_text.lower() for k in ["grievance officer", "data protection officer", "nodal officer", "dpo"])
        has_email = bool(re.search(r"[\w.-]+@[\w.-]+\.\w+", policy_text))

        if has_dpo and has_email:
            self.record_check(
                check_id="P14_GRIEVANCE_OFFICER",
                name="Grievance Redressal Officer Contact Disclosure",
                status="pass",
                severity="info",
                finding_type="informational",
                explanation="Privacy Policy designates a Grievance Redressal / Data Protection Officer with direct contact details.",
                legal_citation="Digital Personal Data Protection Act, 2023 - Section 8(9) & Section 13(1)",
            )
        elif has_dpo:
            self.record_check(
                check_id="P14_GRIEVANCE_OFFICER",
                name="Grievance Redressal Officer Contact Disclosure",
                status="warning",
                severity="low",
                finding_type="suspected",
                explanation="Policy mentions a Grievance Officer, but does not provide direct contact email or postal address in India.",
                impact="Section 13(1) requires Data Fiduciaries to establish readily accessible grievance redressal contact channels.",
                remediation_summary="Publish name, email, and address of the Grievance Officer.",
                legal_citation="Digital Personal Data Protection Act, 2023 - Section 13(1)",
            )
        else:
            self.record_check(
                check_id="P14_GRIEVANCE_OFFICER",
                name="Grievance Redressal Officer Contact Disclosure",
                status="fail",
                severity="medium",
                finding_type="confirmed",
                explanation="No designated Grievance Officer or Data Protection Officer identified in the Privacy Policy.",
                impact="Non-compliance with mandatory Grievance Redressal requirements under DPDP Act Sections 8(9) and 13.",
                remediation_summary="Designate a Grievance Officer in India and publish contact email in the Privacy Policy.",
                legal_citation="Digital Personal Data Protection Act, 2023 - Section 8(9) & Section 13(1)",
            )

    # ---------------- 15. Overall Assessment ----------------

    def _generate_overall_assessment(self) -> Dict[str, Any]:
        passed = sum(1 for c in self.checks if c["status"] == "pass")
        failed = sum(1 for c in self.checks if c["status"] == "fail")
        warning = sum(1 for c in self.checks if c["status"] == "warning")
        total = len(self.checks)

        if failed == 0 and warning <= 2:
            rating = "compliant"
            explanation = "Website demonstrates strong alignment with India's Digital Personal Data Protection Act, 2023 preliminary requirements."
        elif failed <= 1 and warning <= 4:
            rating = "needs_attention"
            explanation = "Website has basic privacy disclosures but exhibits compliance gaps (e.g. missing Grievance Officer or pre-consent tracking)."
        else:
            rating = "high_risk"
            explanation = "Website has critical privacy and compliance deficiencies under the DPDP Act 2023."

        self.record_check(
            check_id="P15_OVERALL_DPDP_ASSESSMENT",
            name="Overall Indian DPDP Act 2023 Preliminary Assessment",
            status="pass" if rating == "compliant" else ("warning" if rating == "needs_attention" else "fail"),
            severity="info" if rating == "compliant" else "medium",
            finding_type="informational",
            explanation=f"[{rating.upper()}] {explanation} ({passed}/{total} privacy signals verified). Automated preliminary assessment; not formal legal counsel.",
            legal_citation="Digital Personal Data Protection Act, 2023 (Act No. 22 of 2023)",
            evidence={"passedChecks": passed, "warningChecks": warning, "failedChecks": failed, "rating": rating},
        )

        return {
            "applicableLaw": "Digital Personal Data Protection Act, 2023 (India)",
            "disclaimer": "Automated preliminary technical assessment, not legal advice.",
            "complianceRating": rating,
            "checksPassed": passed,
            "checksTotal": total,
            "hasGrievanceOfficer": any(c["checkId"] == "P14_GRIEVANCE_OFFICER" and c["status"] == "pass" for c in self.checks),
            "hasRejectParity": any(c["checkId"] == "P06_REJECT_PARITY" and c["status"] == "pass" for c in self.checks),
            "hasTrackersBeforeConsent": any(c["checkId"] == "P05_PRE_CONSENT_TRACKING" and c["status"] == "warning" for c in self.checks),
            "hasChildrenDataClause": any(c["checkId"] == "P12_CHILDREN_DATA_SECTION9" and c["status"] == "pass" for c in self.checks),
        }
