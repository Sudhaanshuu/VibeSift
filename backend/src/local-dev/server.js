import { app } from '../api/app.js';
import { config } from '../config/env.js';

const PORT = config.port || 4000;

app.listen(PORT, () => {
  console.log(`
==========================================================
🚀 VibeSift Backend API running locally at:
   http://localhost:${PORT}

📡 Available Endpoints:
   • GET  /api/health
   • POST /api/scans
   • GET  /api/scans
   • GET  /api/scans/:scanId
   • GET  /api/scans/:scanId/findings
   • GET  /api/scans/:scanId/report
   • POST /api/scans/:scanId/rescan
   • POST /api/scans/:scanId/cancel
   • GET  /api/sites
   • POST /api/sites
   • DELETE /api/sites/:siteId
   • POST /api/sites/verification-challenges
   • POST /api/sites/:siteId/verify

🛡️ Security & Modes:
   • SSRF Protection: ACTIVE (blocks loopback, link-local, AWS IMDS, RFC 1918)
   • Storage Mode: ${config.useLocalStorage ? 'Local In-Memory / File Storage' : 'AWS DynamoDB & S3'}
   • Orchestration: ${config.useMockOrchestration ? 'Local Async Runner' : 'AWS Step Functions & SQS'}
   • Cognito Auth: ${config.cognito.userPoolId ? 'AWS Cognito Live JWKS' : 'Local Development Token Mode'}
==========================================================
`);
});
