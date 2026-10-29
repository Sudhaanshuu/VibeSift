# Service Setup Guide: Amazon CloudWatch Observability & Alarms

> **Role in VibeSift 2.0:** Central Monitoring, Host Metrics, Log Aggregation & Failure Alerts  
> **Cost:** **$0.00 / month (Basic Metrics & 5 GB Log ingestion in AWS Free Tier)**  
> **Region:** `us-east-1` (N. Virginia)

---

## 1. Why Amazon CloudWatch?
- **Unified Observability:** Monitors your Lightsail host health (CPU, RAM, Network) alongside Lambda execution metrics in one dashboard.
- **Automated Alerts:** Triggers instant email notifications via Amazon SNS if CPU exceeds 85% or the server becomes unreachable.
- **Zero Cost within Free Tier:** Basic 5-minute metrics and 10 custom alarms are completely free.

---

## 2. Step 1: Lightsail Host Monitoring & Alarms

AWS Lightsail has native, zero-configuration CloudWatch integration built into the Lightsail Console.

### Step 2.1: Enable Built-in Lightsail Alarms
1. Open the [AWS Lightsail Console](https://lightsail.aws.amazon.com/).
2. Click your instance `vibesift-core-host-prod` $\rightarrow$ **Metrics** tab.
3. You will see 6 real-time metric charts:
   - **CPU utilization (%)**
   - **Network in (MB)**
   - **Network out (MB)**
   - **Status check failed (Instance)**
   - **Status check failed (System)**
4. Next to **CPU utilization**, click **+ Add alarm**:
   - Comparison: **Greater than**
   - Threshold: **85%**
   - Duration: **For 10 minutes**
   - Notification: Enter your email address to receive alert notifications.
5. Click **Create alarm**.

### Step 2.2: Add "Status Check Failed" Alarm
1. Next to **Status check failed (Instance)**, click **+ Add alarm**:
   - Threshold: **Greater than or equal to 1**
   - Notification: Select your verified email.
2. Click **Create alarm**.
*(If your server ever freezes, you get an email within 2 minutes).*

---

## 3. Step 2: Streaming Application Logs to CloudWatch Logs (Optional)

To stream your Node.js and Python error logs from Lightsail to CloudWatch:

### Step 3.1: Install CloudWatch Agent on Lightsail
Connect via SSH and install the official AWS CloudWatch agent:
```bash
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb
```

### Step 3.2: Configure Log Streaming
Create `/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json`:
```json
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/home/ubuntu/.pm2/logs/vibesift-api-error.log",
            "log_group_name": "/vibesift/prod/api-errors",
            "log_stream_name": "{instance_id}"
          },
          {
            "file_path": "/var/log/nginx/error.log",
            "log_group_name": "/vibesift/prod/nginx-errors",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  }
}
```

Start the agent:
```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
  -s
```

---

## 4. Step 3: Create CloudWatch Unified Dashboard

1. Open the [Amazon CloudWatch Console](https://console.aws.amazon.com/cloudwatch/).
2. In the left navigation, select **Dashboards** $\rightarrow$ **Create dashboard**.
3. Name it: `VibeSift-Production-Observability`.
4. Add Widgets:
   - **Widget 1 (Line Chart):** Lightsail CPU Utilization & Network Out.
   - **Widget 2 (Line Chart):** Lambda `vibesift-scheduled-audit-trigger` Invocations & Errors.
   - **Widget 3 (Log Table):** Top errors from `/vibesift/prod/api-errors`.
5. Click **Save dashboard**.
