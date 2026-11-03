import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCouponCode, validateCoupon } from '../src/services/couponService.js';
import { consumePaymentForScan } from '../src/api/routes/payments.js';

test('Coupon Service: normalizes coupon codes by stripping whitespace and casing', () => {
  assert.equal(normalizeCouponCode('flat418'), 'FLAT418');
  assert.equal(normalizeCouponCode('flat 418'), 'FLAT418');
  assert.equal(normalizeCouponCode('FLAT 418'), 'FLAT418');
  assert.equal(normalizeCouponCode(' FLAT418 '), 'FLAT418');
  assert.equal(normalizeCouponCode('  f l a t 4 1 8  '), 'FLAT418');
  assert.equal(normalizeCouponCode(''), '');
  assert.equal(normalizeCouponCode(null), '');
});

test('Coupon Service: validates FLAT418 and applies ₹38 discount resulting in ₹1 payable', async () => {
  const result1 = await validateCoupon('flat 418', 39);
  assert.equal(result1.valid, true);
  assert.equal(result1.code, 'FLAT418');
  assert.equal(result1.originalAmount, 39);
  assert.equal(result1.discountAmount, 38);
  assert.equal(result1.finalAmount, 1);

  const result2 = await validateCoupon('FLAT418', 39);
  assert.equal(result2.valid, true);
  assert.equal(result2.finalAmount, 1);

  const result3 = await validateCoupon('INVALID_CODE', 39);
  assert.equal(result3.valid, false);
  assert.equal(result3.finalAmount, 39);
});

test('Payments: consumePaymentForScan allows valid razorpay payment ID format and rejects null', () => {
  assert.equal(consumePaymentForScan(null, 'usr_123'), false);
  assert.equal(consumePaymentForScan('', 'usr_123'), false);

  const validLivePayment = consumePaymentForScan('pay_live_test123456', 'usr_123');
  assert.ok(validLivePayment);
  assert.equal(validLivePayment.paymentId, 'pay_live_test123456');
  assert.equal(validLivePayment.amount, 39);
});
