#!/usr/bin/env python3
"""
Unit and Integration Tests for VibeSift Python Lambda Function Inspector
Tests:
- Direct Lambda Invocation
- API Gateway HTTP/REST Proxy Event
- Amazon SQS Trigger Event
- Keep-Alive / Warmup Ping Event
- SSRF Guard Protection & Cloud Metadata Blocking
- Missing / Malformed Target URL Handling
- Profile Execution & Schema Compliance
"""

import json
import unittest
from unittest.mock import MagicMock, patch

from lambda_function import lambda_handler, parse_event_payload


class TestVibeSiftLambdaInspector(unittest.TestCase):
    def test_warmup_ping_event(self):
        """Ensures scheduled warm-up ping returns fast 200 without executing full audit."""
        event = {"ping": True}
        result = lambda_handler(event)
        self.assertEqual(result.get("statusCode"), 200)
        body = json.loads(result.get("body", "{}"))
        self.assertEqual(body.get("status"), "warm")

        aws_events_ping = {"source": "aws.events"}
        result_events = lambda_handler(aws_events_ping)
        self.assertEqual(result_events.get("statusCode"), 200)

    def test_missing_target_url_returns_400(self):
        """Ensures empty or missing targetUrl returns a clean HTTP 400 error."""
        cases = [
            {},
            {"targetUrl": ""},
            {"targetUrl": "   "},
            {"body": "{}"},
        ]
        for c in cases:
            res = lambda_handler(c)
            self.assertEqual(res.get("statusCode"), 400, f"Failed for case: {c}")
            self.assertIn("MISSING_TARGET_URL", str(res.get("body", "")))

    def test_ssrf_protection_blocks_private_and_metadata_targets(self):
        """Ensures SSRF attacks against localhost and cloud metadata are strictly blocked with 403."""
        malicious_targets = [
            "http://127.0.0.1:8080/admin",
            "http://localhost/secret",
            "http://169.254.169.254/latest/meta-data/",
            "http://[::1]/internal",
            "file:///etc/passwd",
            "ftp://internal.server/data",
        ]
        for target in malicious_targets:
            event = {
                "targetUrl": target,
                "scanId": "test_ssrf_block",
            }
            res = lambda_handler(event)
            self.assertEqual(res.get("statusCode"), 403, f"Failed to block SSRF for: {target}")
            self.assertEqual(res.get("success"), False)
            error_data = res.get("error") or {}
            self.assertEqual(error_data.get("error"), "SSRF_PROHIBITED")

    def test_parse_event_payload_variations(self):
        """Tests parsing logic for Direct, API Gateway, and SQS event shapes."""
        # 1. Direct
        direct_event = {"targetUrl": "https://example.com", "scanId": "123"}
        self.assertEqual(parse_event_payload(direct_event), direct_event)

        # 2. API Gateway with JSON string body
        apigw_event = {
            "httpMethod": "POST",
            "body": json.dumps({"targetUrl": "https://example.com", "profile": "authorized_deep"}),
        }
        parsed_apigw = parse_event_payload(apigw_event)
        self.assertEqual(parsed_apigw.get("targetUrl"), "https://example.com")
        self.assertEqual(parsed_apigw.get("profile"), "authorized_deep")

        # 3. SQS Event
        sqs_event = {
            "Records": [
                {
                    "messageId": "msg-123",
                    "body": json.dumps({"targetUrl": "https://example.com", "scanId": "sqs-456"}),
                }
            ]
        }
        parsed_sqs = parse_event_payload(sqs_event)
        self.assertEqual(parsed_sqs.get("targetUrl"), "https://example.com")
        self.assertEqual(parsed_sqs.get("scanId"), "sqs-456")

    def test_direct_invocation_execution(self):
        """Ensures direct Lambda invocation executes the full Python audit engine against a safe public host."""
        event = {
            "targetUrl": "https://example.com",
            "scanId": "test_lmb_unit_01",
            "scanProfile": "baseline_public",
        }
        res = lambda_handler(event)
        self.assertEqual(res.get("statusCode"), 200)
        self.assertTrue(res.get("success"))
        report = res.get("report")
        self.assertIsNotNone(report)
        self.assertEqual(report.get("scanId"), "test_lmb_unit_01")
        self.assertIn("checks", report)
        self.assertIn("findings", report)
        self.assertGreater(len(report.get("checks", [])), 20)
        self.assertIn("executionTimeMs", report)

    def test_api_gateway_proxy_invocation_format(self):
        """Ensures Lambda returns a valid API Gateway proxy response with serialized string body."""
        event = {
            "httpMethod": "POST",
            "rawPath": "/audit/scan",
            "headers": {"content-type": "application/json"},
            "body": json.dumps({
                "targetUrl": "https://example.com",
                "scanId": "test_lmb_proxy_02",
                "scanProfile": "baseline_public",
            }),
        }
        res = lambda_handler(event)
        self.assertEqual(res.get("statusCode"), 200)
        self.assertIn("body", res)
        self.assertIsInstance(res["body"], str)
        parsed_body = json.loads(res["body"])
        self.assertTrue(parsed_body.get("success"))
        self.assertEqual(parsed_body.get("scanId"), "test_lmb_proxy_02")


if __name__ == "__main__":
    unittest.main()
