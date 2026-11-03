import { apiClient } from './client';

export interface PaymentConfig {
  keyId: string;
  deepAuditPriceInRupees: number;
  currency: string;
}

export interface CouponValidationResult {
  valid: boolean;
  code?: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  description?: string;
  error?: string;
}

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  amountInPaise: number;
  currency: string;
  keyId: string;
  appliedCoupon: string | null;
  targetUrl?: string;
}

export interface VerifyPaymentPayload {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  targetUrl?: string;
  couponCode?: string;
  amount?: number;
}

export interface VerifyPaymentResponse {
  success: boolean;
  paymentId: string;
  message: string;
}

export async function getPaymentConfig(): Promise<PaymentConfig> {
  try {
    return await apiClient<PaymentConfig>('/payments/config');
  } catch {
    return {
      keyId: (import.meta as any).env?.VITE_RAZORPAY_KEY_ID || 'rzp_live_Td6jjT5Yl85c4L',
      deepAuditPriceInRupees: 39,
      currency: 'INR',
    };
  }
}

export async function validateCouponCode(couponCode: string): Promise<CouponValidationResult> {
  return apiClient<CouponValidationResult>('/payments/validate-coupon', {
    method: 'POST',
    body: JSON.stringify({ couponCode }),
  });
}

export async function createPaymentOrder(targetUrl: string, couponCode?: string): Promise<CreateOrderResponse> {
  return apiClient<CreateOrderResponse>('/payments/create-order', {
    method: 'POST',
    body: JSON.stringify({ targetUrl, couponCode, scanProfile: 'authorized_deep' }),
  });
}

export async function verifyPayment(payload: VerifyPaymentPayload): Promise<VerifyPaymentResponse> {
  return apiClient<VerifyPaymentResponse>('/payments/verify', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Dynamically loads the official Razorpay Checkout modal script
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
