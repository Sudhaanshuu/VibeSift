#!/usr/bin/env node
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const region = process.env.AWS_REGION || 'us-east-1';
const bucket = process.env.S3_REPORTS_BUCKET || 'vibesift-audit-reports-dev-501380833083';
const key = 'config/coupons.json';

const s3 = new S3Client({ region });

async function loadCoupons() {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const raw = await res.Body.transformToString('utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.name === 'NoSuchKey') {
      return { coupons: [] };
    }
    throw err;
  }
}

async function saveCoupons(data) {
  const body = JSON.stringify(data, null, 2);
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: 'application/json',
    })
  );
  console.log(`\nSuccessfully saved updated coupons to s3://${bucket}/${key}`);
}

function normalize(code) {
  return String(code || '').replace(/\s+/g, '').toUpperCase();
}

async function main() {
  const [,, action, arg1, arg2, ...rest] = process.argv;

  if (!action || action === 'help' || action === '--help') {
    console.log(`
VibeSift S3 Coupon Manager
==========================
Usage:
  node backend/scripts/manage-coupons.js list
  node backend/scripts/manage-coupons.js add <CODE> <DISCOUNT_RUPEES> [DESCRIPTION]
  node backend/scripts/manage-coupons.js enable <CODE>
  node backend/scripts/manage-coupons.js disable <CODE>
  node backend/scripts/manage-coupons.js remove <CODE>

Examples:
  node backend/scripts/manage-coupons.js list
  node backend/scripts/manage-coupons.js disable FLAT418
  node backend/scripts/manage-coupons.js enable FLAT418
  node backend/scripts/manage-coupons.js add LAUNCH10 10 "Launch discount"
    `);
    return;
  }

  const data = await loadCoupons();
  if (!Array.isArray(data.coupons)) {
    data.coupons = [];
  }

  switch (action.toLowerCase()) {
    case 'list': {
      console.log(`\nCoupons stored in s3://${bucket}/${key}:`);
      console.table(
        data.coupons.map((c) => ({
          Code: c.code,
          'Discount (₹)': c.discountRupees,
          Active: c.active ? 'YES' : 'NO',
          Description: c.description || '-',
          Created: c.createdAt || '-',
        }))
      );
      break;
    }

    case 'enable': {
      if (!arg1) {
        console.error('Error: Please provide coupon code to enable.');
        process.exit(1);
      }
      const target = normalize(arg1);
      const coupon = data.coupons.find((c) => normalize(c.code) === target);
      if (!coupon) {
        console.error(`Error: Coupon "${arg1}" not found.`);
        process.exit(1);
      }
      coupon.active = true;
      coupon.updatedAt = new Date().toISOString();
      await saveCoupons(data);
      console.log(`Coupon "${coupon.code}" is now ACTIVE.`);
      break;
    }

    case 'disable': {
      if (!arg1) {
        console.error('Error: Please provide coupon code to disable.');
        process.exit(1);
      }
      const target = normalize(arg1);
      const coupon = data.coupons.find((c) => normalize(c.code) === target);
      if (!coupon) {
        console.error(`Error: Coupon "${arg1}" not found.`);
        process.exit(1);
      }
      coupon.active = false;
      coupon.updatedAt = new Date().toISOString();
      await saveCoupons(data);
      console.log(`Coupon "${coupon.code}" is now DISABLED.`);
      break;
    }

    case 'add': {
      if (!arg1 || !arg2) {
        console.error('Usage: manage-coupons.js add <CODE> <DISCOUNT_RUPEES> [DESCRIPTION]');
        process.exit(1);
      }
      const code = normalize(arg1);
      const discount = parseInt(arg2, 10);
      if (isNaN(discount) || discount < 1) {
        console.error('Error: Discount must be a positive integer.');
        process.exit(1);
      }
      const description = [arg1, ...rest].length > 1 ? [rest.join(' ')].join(' ') : `₹${discount} discount`;

      const existing = data.coupons.find((c) => normalize(c.code) === code);
      if (existing) {
        existing.discountRupees = discount;
        existing.active = true;
        existing.description = description || existing.description;
        existing.updatedAt = new Date().toISOString();
        console.log(`Updated existing coupon "${code}".`);
      } else {
        data.coupons.push({
          code,
          discountRupees: discount,
          active: true,
          description: description || `₹${discount} discount`,
          createdAt: new Date().toISOString(),
        });
        console.log(`Added new coupon "${code}".`);
      }
      await saveCoupons(data);
      break;
    }

    case 'remove': {
      if (!arg1) {
        console.error('Error: Please provide coupon code to remove.');
        process.exit(1);
      }
      const target = normalize(arg1);
      const initialCount = data.coupons.length;
      data.coupons = data.coupons.filter((c) => normalize(c.code) !== target);
      if (data.coupons.length === initialCount) {
        console.error(`Error: Coupon "${arg1}" not found.`);
        process.exit(1);
      }
      await saveCoupons(data);
      console.log(`Removed coupon "${arg1}".`);
      break;
    }

    default:
      console.error(`Unknown action "${action}". Run with 'help' for options.`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('Coupon manager failed:', err.message);
  process.exit(1);
});
