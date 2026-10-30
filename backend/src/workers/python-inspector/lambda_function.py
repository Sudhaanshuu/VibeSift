#!/usr/bin/env python3
"""
VibeSift AWS Lambda Function - Unified Python Security, Privacy & Health Inspector

Triggers the full suite of VibeSift audit checks inside AWS Lambda:
- BasicAuditor: 34 completeness, trust, SEO, and performance health checks
- DeepAuditor: 22 distinct deep security checks (XSS, SQLi, CSRF, CSP, SSRF, Auth, Cookies, CORS, etc.)
- PrivacyAuditor: 15 Indian DPDP Act 2023 & consent compliance checks

Supports multiple trigger sources:
1. Direct Invocation / AWS Console Test Event / AWS SDK InvokeCommand / Step Functions Task
2. API Gateway HTTP / REST API Proxy
3. Amazon SQS Trigger (event.Records[0].body)
4. Amazon S3 Trigger / CloudWatch Scheduled Event
"""

import json
import logging
import os
import sys
import time
import uuid
from typing import Any, Dict, Optional

# Ensure local imports work in Lambda environment
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from inspector import UnifiedInspector
from ssrf_guard import SSRFProtectionError, validate_url

# Optional boto3 import (pre-installed in standard AWS Lambda runtimes)
try:
    import boto3
    s3_client = boto3.client("s3")
except Exception:
    boto3 = None
    s3_client = None

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("VibeSiftLambdaInspector")


def parse_event_payload(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalizes inputs from Direct invocation, API Gateway, SQS, or S3 triggers.
    """
    if not isinstance(event, dict):
        return {}

    # Case 1: SQS Trigger
    if "Records" in event and isinstance(event["Records"], list) and len(event["Records"]) > 0:
        first_record = event["Records"][0]
        if "body" in first_record:
            try:
                parsed_body = json.loads(first_record["body"])
                if isinstance(parsed_body, dict):
                    return parsed_body
            except Exception as e:
                logger.warning(f"Failed to parse SQS record body as JSON: {e}")

    # Case 2: API Gateway HTTP API / REST Proxy Event
    if "body" in event and event["body"]:
        raw_body = event["body"]
        if isinstance(raw_body, str):
            try:
                # Handle base64 encoded payload if flagged
                if event.get("isBase64Encoded"):
                    import base64
                    raw_body = base64.b64decode(raw_body).decode("utf-8")
                parsed_body = json.loads(raw_body)
                if isinstance(parsed_body, dict):
                    return parsed_body
            except Exception as e:
                logger.warning(f"Failed to parse API Gateway body as JSON: {e}")
        elif isinstance(raw_body, dict):
            return raw_body

    # Case 3: API Gateway Query Parameters (fallback)
    if "queryStringParameters" in event and event["queryStringParameters"]:
        return event["queryStringParameters"]

    # Case 4: Direct Invocation / Step Functions Task / Console Test Event
    return event


def upload_to_s3_if_configured(
    bucket_name: Optional[str],
    scan_id: str,
    report: Dict[str, Any]
) -> Optional[str]:
    """
    Saves raw scanner output directly to Amazon S3 if bucket is configured.
    """
    if not bucket_name or not s3_client:
        return None

    s3_key = f"scans/{scan_id}/raw/custom-python.json"
    try:
        s3_client.put_object(
            Bucket=bucket_name,
            Key=s3_key,
            Body=json.dumps(report, indent=2).encode("utf-8"),
            ContentType="application/json",
        )
        logger.info(f"Successfully uploaded Lambda inspector output to s3://{bucket_name}/{s3_key}")
        return s3_key
    except Exception as s3_err:
        logger.warning(f"Failed to upload report to S3 bucket {bucket_name}: {s3_err}")
        return None


def lambda_handler(event: Dict[str, Any], context: Any = None) -> Dict[str, Any]:
    """
    AWS Lambda handler function.
    """
    start_time = time.time()
    logger.info(f"Received Lambda invocation with event keys: {list(event.keys()) if isinstance(event, dict) else type(event)}")

    # Handle keep-alive / warmup ping
    if isinstance(event, dict) and (event.get("source") == "aws.events" or event.get("ping")):
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"status": "warm", "timestamp": time.time()}),
        }

    payload = parse_event_payload(event)

    # Extract target URL & parameters
    target_url = (
        payload.get("targetUrl")
        or payload.get("url")
        or payload.get("target")
        or payload.get("site")
    )
    scan_id = payload.get("scanId") or f"scn_{uuid.uuid4().hex[:12]}"
    scan_profile = payload.get("scanProfile") or payload.get("profile") or "baseline_public"
    max_pages = int(payload.get("maxPages") or payload.get("max_pages") or 5)
    timeout = float(payload.get("timeout") or 6.0)
    job_timeout = float(payload.get("jobTimeout") or payload.get("job_timeout") or 45.0)

    # Optional S3 bucket override from event or environment
    s3_bucket = (
        payload.get("s3Bucket")
        or payload.get("bucket")
        or os.environ.get("S3_REPORTS_BUCKET")
        or os.environ.get("S3_BUCKET")
    )

    is_api_gateway = bool(
        isinstance(event, dict) and ("httpMethod" in event or "requestContext" in event or "rawPath" in event)
    )

    if not target_url or not isinstance(target_url, str) or not target_url.strip():
        err_response = {
            "error": "MISSING_TARGET_URL",
            "message": "A valid 'targetUrl' or 'url' parameter is required in the payload.",
            "scanId": scan_id,
        }
        return {
            "statusCode": 400,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps(err_response) if is_api_gateway else err_response,
            "error": err_response,
        }

    target_url = target_url.strip()

    try:
        logger.info(f"Executing UnifiedInspector for {target_url} (scanId={scan_id}, profile={scan_profile})")
        inspector = UnifiedInspector(
            target_url=target_url,
            scan_id=scan_id,
            profile=scan_profile,
            max_pages=max_pages,
            timeout=timeout,
            job_timeout=job_timeout,
        )
        report = inspector.run()

        # Upload directly to S3 if bucket is configured
        s3_key = upload_to_s3_if_configured(s3_bucket, scan_id, report)
        if s3_key:
            report["s3ArtifactKey"] = s3_key
            report["s3Bucket"] = s3_bucket

        duration_ms = int((time.time() - start_time) * 1000)
        report["lambdaExecutionDurationMs"] = duration_ms

        response_body = {
            "success": True,
            "scanId": scan_id,
            "targetUrl": target_url,
            "scanProfile": scan_profile,
            "s3Key": s3_key,
            "summary": {
                "totalChecks": len(report.get("checks", [])),
                "totalFindings": len(report.get("findings", [])),
                "executionTimeMs": report.get("executionTimeMs", duration_ms),
            },
            "report": report,
        }

        # Format dual-compatible return (works for API Gateway, Step Functions, and direct SDK invocations)
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps(response_body) if is_api_gateway else response_body,
            # Direct access convenience fields
            "success": True,
            "scanId": scan_id,
            "targetUrl": target_url,
            "report": report,
            "s3Key": s3_key,
        }

    except SSRFProtectionError as ssrf_err:
        logger.warning(f"SSRF Protection triggered in Lambda for {target_url}: {ssrf_err}")
        err_obj = {
            "success": False,
            "scanId": scan_id,
            "targetUrl": target_url,
            "error": "SSRF_PROHIBITED",
            "message": str(ssrf_err),
            "findings": [],
            "checks": [],
        }
        return {
            "statusCode": 403,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps(err_obj) if is_api_gateway else err_obj,
            "error": err_obj,
            "success": False,
        }

    except Exception as exc:
        logger.error(f"Fatal error during Lambda inspection for {target_url}: {exc}", exc_info=True)
        err_obj = {
            "success": False,
            "scanId": scan_id,
            "targetUrl": target_url,
            "error": "EXECUTION_ERROR",
            "message": str(exc),
        }
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps(err_obj) if is_api_gateway else err_obj,
            "error": err_obj,
            "success": False,
        }


# Direct entrypoint for CLI testing or local demonstration
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Test VibeSift Python Inspector Lambda Handler")
    parser.add_argument("--url", default="https://example.com", help="Target URL to test")
    parser.add_argument("--profile", default="baseline_public", choices=["baseline_public", "authorized_deep"])
    parser.add_argument("--scan-id", default=f"test_lmb_{uuid.uuid4().hex[:8]}")
    parser.add_argument("--test", action="store_true", help="Run quick self-test against example.com")
    args = parser.parse_args()

    test_event = {
        "targetUrl": args.url,
        "scanId": args.scan_id,
        "scanProfile": args.profile,
    }

    print(f"[TEST] Invoking lambda_handler with test event: {test_event}")
    result = lambda_handler(test_event)
    print(f"[TEST] Result status: {result.get('statusCode')}")
    if result.get("statusCode") == 200:
        rep = result.get("report") or {}
        print(f"[TEST] Checks executed: {len(rep.get('checks', []))}")
        print(f"[TEST] Findings produced: {len(rep.get('findings', []))}")
        print(f"[TEST] Execution time: {rep.get('executionTimeMs')}ms")
    else:
        print(f"[TEST] Error: {result.get('error')}")
