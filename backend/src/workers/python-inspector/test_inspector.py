"""
Unit tests for Python inspection worker and SSRF guard
"""

import unittest
from ssrf_guard import (
    SSRFProtectionError,
    is_disallowed_ip,
    validate_url,
)

class TestSSRFGuard(unittest.TestCase):
    def test_blocks_private_and_loopback_ips(self):
        self.assertTrue(is_disallowed_ip("127.0.0.1"))
        self.assertTrue(is_disallowed_ip("10.0.0.1"))
        self.assertTrue(is_disallowed_ip("172.16.0.1"))
        self.assertTrue(is_disallowed_ip("192.168.1.1"))
        self.assertTrue(is_disallowed_ip("169.254.169.254")) # AWS metadata
        self.assertTrue(is_disallowed_ip("::1")) # IPv6 loopback
        self.assertTrue(is_disallowed_ip("fc00::1")) # IPv6 ULA
        self.assertTrue(is_disallowed_ip("fe80::1")) # IPv6 link-local

    def test_allows_public_ips(self):
        self.assertFalse(is_disallowed_ip("8.8.8.8"))
        self.assertFalse(is_disallowed_ip("1.1.1.1"))
        self.assertFalse(is_disallowed_ip("93.184.216.34"))

    def test_rejects_disallowed_schemes(self):
        for bad_url in [
            "ftp://example.com",
            "file:///etc/passwd",
            "gopher://127.0.0.1",
            "ldap://example.com",
        ]:
            with self.assertRaises(SSRFProtectionError):
                validate_url(bad_url)

    def test_rejects_embedded_credentials(self):
        with self.assertRaises(SSRFProtectionError):
            validate_url("https://user:password@example.com")

    def test_rejects_cloud_metadata_hosts(self):
        with self.assertRaises(SSRFProtectionError):
            validate_url("http://169.254.169.254/latest/meta-data/")
        with self.assertRaises(SSRFProtectionError):
            validate_url("http://metadata/computeMetadata/v1/")

if __name__ == "__main__":
    unittest.main()
