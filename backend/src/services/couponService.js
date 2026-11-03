import { s3Service } from './s3Storage.js';
import { config } from '../config/env.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const COUPONS_S3_KEY = 'config/coupons.json';
const CACHE_TTL_MS = 30 * 1000; // 30 seconds in-memory cache

let inMemoryCache = null;
let lastCacheFetchTime = 0;

export const DEFAULT_COUPONS = {
  coupons: [
    {
      code: 'FLAT418',
      discountRupees: 38,
      active: true,
      description: 'Exclusive flat ₹38 discount — deep audit for ₹1',
      createdAt: '2026-11-03T18:00:00.000Z',
    },
  ],
};

/**
 * Normalizes coupon code by stripping all whitespace and converting to uppercase.
 * Handles "flat 418", "flat418", "FLAT 418", "FLAT418" identically.
 */
export function normalizeCouponCode(rawCode) {
  if (!rawCode || typeof rawCode !== 'string') return '';
  return rawCode.replace(/\s+/g, '').toUpperCase();
}

/**
 * Fetches the active coupon directory from S3 (or local storage fallback).
 * Uses a 30s cache to avoid excessive S3 GET requests during bursts.
 */
export async function getCoupons(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && inMemoryCache && now - lastCacheFetchTime < CACHE_TTL_MS) {
    return inMemoryCache;
  }

  try {
    const rawContent = await s3Service.getObjectContent(COUPONS_S3_KEY);
    if (rawContent) {
      const parsed = JSON.parse(rawContent);
      inMemoryCache = parsed;
      lastCacheFetchTime = now;
      return parsed;
    }
  } catch (err) {
    console.warn(`[CouponService] Note fetching coupons from S3 "${COUPONS_S3_KEY}":`, err.message);
  }

  // Fallback to local file if available
  const localPaths = [
    path.resolve(process.cwd(), '.local_storage', 's3', COUPONS_S3_KEY),
    path.resolve(process.cwd(), 'backend', '.local_storage', 's3', COUPONS_S3_KEY),
    path.resolve(process.cwd(), 'backend', 'src', 'config', 'coupons.json'),
  ];

  for (const lp of localPaths) {
    try {
      const fileData = await fs.readFile(lp, 'utf-8');
      const parsed = JSON.parse(fileData);
      inMemoryCache = parsed;
      lastCacheFetchTime = now;
      return parsed;
    } catch {}
  }

  // Default fallback
  inMemoryCache = DEFAULT_COUPONS;
  lastCacheFetchTime = now;
  return DEFAULT_COUPONS;
}

/**
 * Persists coupons data to S3 and local storage.
 */
export async function saveCoupons(couponsData) {
  const content = JSON.stringify(couponsData, null, 2);
  await s3Service.putObject(COUPONS_S3_KEY, content, 'application/json');

  // Also write to local storage path for offline dev
  try {
    const localDir = path.resolve(process.cwd(), '.local_storage', 's3', 'config');
    await fs.mkdir(localDir, { recursive: true });
    await fs.writeFile(path.join(localDir, 'coupons.json'), content, 'utf-8');
  } catch {}

  inMemoryCache = couponsData;
  lastCacheFetchTime = Date.now();
  return true;
}

/**
 * Validates a coupon code against configured coupons in S3.
 *
 * @param {string} rawCode - User provided coupon code
 * @param {number} baseAmount - Default scan cost (₹39)
 * @returns {Promise<{ valid: boolean, code?: string, originalAmount: number, discountAmount: number, finalAmount: number, error?: string }>}
 */
export async function validateCoupon(rawCode, baseAmount = config.razorpay?.deepAuditPriceInRupees || 39) {
  const normalized = normalizeCouponCode(rawCode);
  if (!normalized) {
    return {
      valid: false,
      originalAmount: baseAmount,
      discountAmount: 0,
      finalAmount: baseAmount,
      error: 'Please enter a valid coupon code.',
    };
  }

  const data = await getCoupons();
  const coupons = Array.isArray(data?.coupons) ? data.coupons : [];

  const matched = coupons.find((c) => normalizeCouponCode(c.code) === normalized);

  if (!matched) {
    return {
      valid: false,
      originalAmount: baseAmount,
      discountAmount: 0,
      finalAmount: baseAmount,
      error: 'Coupon code not found.',
    };
  }

  if (matched.active === false) {
    return {
      valid: false,
      originalAmount: baseAmount,
      discountAmount: 0,
      finalAmount: baseAmount,
      error: 'This coupon code is currently disabled.',
    };
  }

  const discountAmount = Math.min(baseAmount, Number(matched.discountRupees || 0));
  // Ensure minimum 1 INR for Razorpay transactions
  const finalAmount = Math.max(1, baseAmount - discountAmount);

  return {
    valid: true,
    code: matched.code,
    originalAmount: baseAmount,
    discountAmount,
    finalAmount,
    description: matched.description || `₹${discountAmount} discount applied`,
  };
}
