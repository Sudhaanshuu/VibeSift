# Service Setup Guide: AWS Lambda Automation & Scheduled Webhooks

> **Role in VibeSift 2.0:** Serverless Trigger for Scheduled Audits & Uptime Webhooks  
> **Runtime:** Node.js 22.x (or Python 3.12)  
> **Cost:** **$0.00 / month (1M requests/month in AWS Free Tier)**  
> **Memory:** 128 MB | **Timeout:** 15 seconds

---

## 1. Why AWS Lambda here?
- **Decoupled Cron/Automation:** Instead of running heavy cron jobs on the Lightsail server, AWS Lambda is triggered on a schedule by **Amazon EventBridge** (CloudWatch Events).
- **Zero Idle Resource Consumption:** Runs only for 1–2 seconds to send an authenticated scan trigger or check system health, costing $0.00.

---

## 2. Step-by-Step AWS Console Provisioning

### Step 2.1: Create Lambda Function
1. Open the [AWS Lambda Console](https://console.aws.amazon.com/lambda/).
2. Click **Create function**.
3. Choose **Author from scratch**.
4. Basic information:
   - Function name: `vibesift-scheduled-audit-trigger`
   - Runtime: **Node.js 22.x**
   - Architecture: **arm64** (or x86_64)
5. Permissions: Select **Create a new role with basic Lambda permissions**.
6. Click **Create function**.

### Step 2.2: Function Code (`index.mjs`)
Paste the following production-ready trigger code:

```javascript
/**
 * VibeSift Scheduled Audit & Webhook Trigger
 * Sends an authenticated dispatch call to the Lightsail API.
 */
export const handler = async (event) => {
  const API_URL = process.env.VIBESIFT_API_URL || 'https://vibesift.pixir.in/api';
  const CRON_SECRET = process.env.CRON_TRIGGER_SECRET || 'vbs_cron_secret_sample';
  
  console.log(`[LambdaTrigger] Starting scheduled audit trigger to ${API_URL}...`);

  try {
    const response = await fetch(`${API_URL}/scans/scheduled`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': CRON_SECRET,
        'User-Agent': 'VibeSift-Lambda-Scheduler/2.0',
      },
      body: JSON.stringify({
        source: 'aws.events',
        time: event.time || new Date().toISOString(),
        profile: 'baseline_public',
      }),
    });

    const statusCode = response.status;
    const body = await response.text();

    console.log(`[LambdaTrigger] API responded with HTTP ${statusCode}: ${body.slice(0, 100)}`);

    return {
      statusCode,
      body: JSON.stringify({ message: 'Trigger dispatched successfully', status: statusCode }),
    };
  } catch (error) {
    console.error('[LambdaTrigger] Failed to reach VibeSift API:', error.message);
    throw error;
  }
};
```

### Step 2.3: Configure Environment Variables
1. Go to the **Configuration** tab $\rightarrow$ **Environment variables**.
2. Click **Edit** and add:
   - `VIBESIFT_API_URL`: `https://vibesift.pixir.in/api`
   - `CRON_TRIGGER_SECRET`: *(A high-entropy secret token matching your Lightsail `.env`)*
3. Click **Save**.

### Step 2.4: Adjust Timeout & Memory
1. In **Configuration** $\rightarrow$ **General configuration**:
   - Memory: **128 MB** (lowest cost)
   - Timeout: **15 seconds**
2. Click **Save**.

---

## 3. Step 3: Configure EventBridge Cron Trigger

To automatically trigger website re-audits every morning at 00:00 UTC:

1. In the Lambda function overview, click **+ Add trigger**.
2. Select **EventBridge (CloudWatch Events)**.
3. Rule configuration:
   - Select **Create a new rule**.
   - Rule name: `vibesift-daily-audit-cron`
   - Rule type: **Schedule expression**
   - Schedule expression: `cron(0 0 * * ? *)` (Daily at midnight UTC) or `rate(1 day)`
4. Click **Add**.

---

## 4. Verification

1. In the Lambda Console, navigate to the **Test** tab.
2. Click **Test** with a blank JSON payload `{}`.
3. Review execution logs:
```
START RequestId: ...
2026-10-29T... [LambdaTrigger] Starting scheduled audit trigger to https://vibesift.pixir.in/api...
2026-10-29T... [LambdaTrigger] API responded with HTTP 200
END RequestId: ...
REPORT RequestId: ... Duration: 420.32 ms Billed Duration: 421 ms Memory Size: 128 MB Max Memory Used: 68 MB
```
