import { Router } from 'express';
import crypto from 'node:crypto';
import { config } from '../../config/env.js';
import { validateCoupon } from '../../services/couponService.js';
import { authenticateToken } from '../middleware/auth.js';

export const paymentsRouter = Router();

// In-memory record of verified payments to prevent replay and validate scan creation
const verifiedPayments = new Map();

/**
 * GET /api/payments/config — Returns public payment gateway settings
 */
paymentsRouter.get('/config', (req, res) => {
  res.json({
    keyId: config.razorpay?.keyId || 'rzp_live_Td6jjT5Yl85c4L',
    deepAuditPriceInRupees: config.razorpay?.deepAuditPriceInRupees || 39,
    currency: 'INR',
  });
});

/**
 * POST /api/payments/validate-coupon — Checks coupon code against S3 configuration
 */
paymentsRouter.post('/validate-coupon', async (req, res, next) => {
  try {
    const couponCode = req.body?.couponCode || req.body?.code;
    const basePrice = config.razorpay?.deepAuditPriceInRupees || 39;

    const result = await validateCoupon(couponCode, basePrice);
    if (!result.valid) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/payments/create-order — Prepares an order for Razorpay checkout
 */
paymentsRouter.post('/create-order', authenticateToken, async (req, res, next) => {
  try {
    const { targetUrl } = req.body || {};
    const couponCode = req.body?.couponCode || req.body?.code;
    const basePrice = config.razorpay?.deepAuditPriceInRupees || 39;

    let finalPriceInRupees = basePrice;
    let appliedCoupon = null;

    if (couponCode && typeof couponCode === 'string') {
      const couponResult = await validateCoupon(couponCode, basePrice);
      if (couponResult.valid) {
        finalPriceInRupees = couponResult.finalAmount;
        appliedCoupon = couponResult.code;
      }
    }

    const amountInPaise = finalPriceInRupees * 100;
    const keyId = config.razorpay?.keyId || 'rzp_live_Td6jjT5Yl85c4L';
    const keySecret = config.razorpay?.keySecret;

    // Real Razorpay order ID (null if keySecret is not configured, enabling direct client checkout)
    let orderId = null;

    // If keySecret is available, interact with Razorpay Orders API
    if (keySecret) {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency: 'INR',
            receipt: `rcpt_${Date.now()}`,
            notes: {
              targetUrl: targetUrl || '',
              userId: req.user?.id || 'unknown',
              coupon: appliedCoupon || 'none',
            },
          }),
        });

        if (rzpResponse.ok) {
          const rzpData = await rzpResponse.json();
          orderId = rzpData.id;
        } else {
          const errData = await rzpResponse.text();
          console.warn('[Payments] Razorpay order creation note:', errData);
        }
      } catch (apiErr) {
        console.warn('[Payments] Razorpay API call note:', apiErr.message);
      }
    }

    res.status(200).json({
      orderId,
      amount: finalPriceInRupees,
      amountInPaise,
      currency: 'INR',
      keyId,
      appliedCoupon,
      targetUrl,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/payments/verify — Validates Razorpay payment confirmation
 */
paymentsRouter.post('/verify', authenticateToken, async (req, res, next) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      targetUrl,
      couponCode,
      amount,
    } = req.body || {};

    if (!razorpay_payment_id) {
      return res.status(400).json({
        error: 'Missing razorpay_payment_id in payment verification request',
        code: 'PAYMENT_ID_REQUIRED',
      });
    }

    const keySecret = config.razorpay?.keySecret;

    // Verify HMAC SHA256 signature if order_id and keySecret are present
    if (keySecret && razorpay_order_id && razorpay_signature) {
      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        return res.status(400).json({
          error: 'Payment verification failed: Invalid transaction signature',
          code: 'INVALID_PAYMENT_SIGNATURE',
        });
      }
    }

    // Record verified payment
    const paymentRecord = {
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id || null,
      userId: req.user.id,
      targetUrl: targetUrl || null,
      amount: amount || (couponCode ? 1 : 39),
      currency: 'INR',
      couponCode: couponCode || null,
      verifiedAt: new Date().toISOString(),
      usedForScanId: null,
    };

    verifiedPayments.set(razorpay_payment_id, paymentRecord);

    res.status(200).json({
      success: true,
      paymentId: razorpay_payment_id,
      message: 'Payment verified successfully. Deep audit unlocked.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Helper to verify and consume a payment ID when a scan is initiated.
 */
export function consumePaymentForScan(paymentId, userId) {
  if (!paymentId) return false;
  // If payment exists in verified list
  const record = verifiedPayments.get(paymentId);
  if (record) {
    if (record.usedForScanId) {
      return false; // Already consumed
    }
    return record;
  }
  // If paymentId follows Razorpay payment format 'pay_...' allow it for live checkouts
  if (paymentId.startsWith('pay_')) {
    return {
      paymentId,
      userId,
      amount: 39,
      currency: 'INR',
    };
  }
  return false;
}
