# Amazon Cognito & API Gateway Setup Guide

This guide details how to configure Amazon Cognito User Pools for developer authentication and Amazon API Gateway HTTP API v2 with JWT authorizers.

---

## 1. Amazon Cognito User Pool Configuration

VibeSift supports multi-tenant developer authentication with custom claims, password recovery, and email verification.

### Step 1: Create Cognito User Pool via CLI
```bash
aws cognito-idp create-user-pool \
  --pool-name VibeSift-Developers-dev \
  --auto-verified-attributes email \
  --username-attributes email \
  --policies '{
    "PasswordPolicy": {
      "MinimumLength": 8,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": false,
      "TemporaryPasswordValidityDays": 7
    }
  }' \
  --schema '[
    {
      "Name": "plan",
      "AttributeDataType": "String",
      "DeveloperOnlyAttribute": false,
      "Mutable": true,
      "Required": false,
      "StringAttributeConstraints": {
        "MinLength": "1",
        "MaxLength": "32"
      }
    }
  ]' \
  --region us-east-1
```

Note the output **`Id`** (e.g. `us-east-1_abcdef123`).

### Step 2: Create App Client (For Single-Page React App)
The React SPA requires a public client **without** a client secret:

```bash
USER_POOL_ID="<YOUR_USER_POOL_ID>"

aws cognito-idp create-user-pool-client \
  --user-pool-id $USER_POOL_ID \
  --client-name VibeSift-SPA-Client \
  --no-generate-secret \
  --explicit-auth-flows \
      ALLOW_USER_SRP_AUTH \
      ALLOW_REFRESH_TOKEN_AUTH \
      ALLOW_USER_PASSWORD_AUTH \
  --prevent-user-existence-errors ENABLED \
  --region us-east-1
```

Note the output **`ClientId`** (e.g. `3a4b5c6d7e8f9g0h1i2j3k4l5m`).

---

## 2. API Gateway HTTP API (v2) Setup

The HTTP API provides sub-second latency, CORS handling, and native JWT token validation.

### Step 1: Create HTTP API
```bash
aws apigatewayv2 create-api \
  --name VibeSift-API-dev \
  --protocol-type HTTP \
  --cors-configuration '{
    "AllowHeaders": ["Content-Type", "Authorization", "X-Request-ID", "Idempotency-Key"],
    "AllowMethods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    "AllowOrigins": ["https://vibesift.pixir.in", "http://localhost:5173"],
    "MaxAge": 3600
  }' \
  --region us-east-1
```

### Step 2: Create JWT Authorizer
Point the JWT authorizer to your Cognito User Pool:

```bash
API_ID="<YOUR_API_ID>"
CLIENT_ID="<YOUR_CLIENT_ID>"
REGION="us-east-1"
ISSUER="https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}"

aws apigatewayv2 create-authorizer \
  --api-id $API_ID \
  --name CognitoJWTAuthorizer \
  --authorizer-type JWT \
  --identity-source '$request.header.Authorization' \
  --jwt-configuration "{\"Audience\":[\"${CLIENT_ID}\"],\"Issuer\":\"${ISSUER}\"}" \
  --region $REGION
```

### Step 3: Deploy Lambda Integration
The CDK stack (`infra/lib/api-stack.ts`) packages `backend/src/api/lambdaHandler.js` and associates it with the API Gateway routes.

---

## 3. Environment Variables Mapping

Add the Cognito attributes to both the root and backend `.env`:

### Frontend (`.env`):
```ini
VITE_API_BASE_URL=https://<api-id>.execute-api.us-east-1.amazonaws.com
VITE_COGNITO_USER_POOL_ID=us-east-1_abcdef123
VITE_COGNITO_CLIENT_ID=3a4b5c6d7e8f9g0h1i2j3k4l5m
VITE_AWS_REGION=us-east-1
VITE_USE_MOCK_API=false
```

### Backend (`backend/.env`):
```ini
COGNITO_USER_POOL_ID=us-east-1_abcdef123
COGNITO_CLIENT_ID=3a4b5c6d7e8f9g0h1i2j3k4l5m
COGNITO_ISSUER=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_abcdef123
```

---

## Next Steps
Proceed to [07-END-TO-END-DEPLOYMENT-RUNBOOK.md](./07-END-TO-END-DEPLOYMENT-RUNBOOK.md) for the complete automated CDK deployment runbook.
