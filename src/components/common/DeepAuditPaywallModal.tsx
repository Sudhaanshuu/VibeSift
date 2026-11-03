import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  X, 
  Lock, 
  Tag, 
  ArrowRight, 
  AlertCircle,
  FileCheck,
  Scale,
  Sparkles
} from 'lucide-react';
import { Button } from './Button';
import { 
  validateCouponCode, 
  createPaymentOrder, 
  verifyPayment, 
  loadRazorpayScript,
  CouponValidationResult 
} from '../../lib/api/payments';
import { AuthContext } from '../../context/AuthContext';

interface DeepAuditPaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUrl: string;
  onPaymentSuccess: (paymentDetails: { paymentId: string; orderId?: string; couponCode?: string }) => void;
}

export const DeepAuditPaywallModal: React.FC<DeepAuditPaywallModalProps> = ({
  isOpen,
  onClose,
  targetUrl,
  onPaymentSuccess,
}) => {
  const authContext = React.useContext(AuthContext);
  const user = authContext?.user;
  const [couponInput, setCouponInput] = useState('');
  const [couponResult, setCouponResult] = useState<CouponValidationResult | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Lock background body scrolling when modal is open to prevent page behind from scrolling
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const basePrice = 39;
  const currentPrice = couponResult?.valid ? couponResult.finalAmount : basePrice;
  const discountAmount = couponResult?.valid ? couponResult.discountAmount : 0;

  const handleApplyCoupon = async (e?: React.SyntheticEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!couponInput.trim()) return;

    setIsValidatingCoupon(true);
    setCouponError(null);

    try {
      const res = await validateCouponCode(couponInput.trim());
      if (res.valid) {
        setCouponResult(res);
      } else {
        setCouponResult(null);
        setCouponError(res.error || 'Invalid or inactive coupon code.');
      }
    } catch (err: any) {
      setCouponResult(null);
      setCouponError(err.message || 'Unable to validate coupon code.');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponResult(null);
    setCouponInput('');
    setCouponError(null);
  };

  const handlePay = async () => {
    setPaymentError(null);
    setIsProcessingPayment(true);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load secure Razorpay gateway. Please check your internet connection.');
      }

      const order = await createPaymentOrder(targetUrl, couponResult?.code);

      const options: any = {
        key: order.keyId,
        amount: order.amountInPaise,
        currency: order.currency || 'INR',
        name: 'VibeSift by Pixir',
        description: `Deep Security & DPDP Audit`,
        image: 'https://vibesift.pixir.in/shield-check.svg',
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#059669', // brand emerald
        },
        modal: {
          ondismiss: () => {
            setIsProcessingPayment(false);
          },
        },
        handler: async (response: any) => {
          try {
            await verifyPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id || order.orderId || undefined,
              razorpay_signature: response.razorpay_signature,
              targetUrl,
              couponCode: order.appliedCoupon || undefined,
              amount: currentPrice,
            });

            setIsProcessingPayment(false);
            onPaymentSuccess({
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id || order.orderId || undefined,
              couponCode: order.appliedCoupon || undefined,
            });
          } catch (verifyErr: any) {
            setPaymentError(verifyErr.message || 'Payment verification encountered an issue.');
            setIsProcessingPayment(false);
          }
        },
      };

      // Only pass order_id if it was genuinely created by Razorpay Orders API
      if (order.orderId && typeof order.orderId === 'string' && order.orderId.startsWith('order_') && !order.orderId.includes('local')) {
        options.order_id = order.orderId;
      }

      const razorpayInstance = new (window as any).Razorpay(options);
      razorpayInstance.on('payment.failed', (failRes: any) => {
        const errorDesc = failRes?.error?.description || failRes?.error?.reason || 'Payment was cancelled or failed.';
        setPaymentError(errorDesc);
        setIsProcessingPayment(false);
      });
      razorpayInstance.open();
    } catch (err: any) {
      setPaymentError(err.message || 'Payment initialization failed. Please try again.');
      setIsProcessingPayment(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex min-h-screen items-center justify-center p-3 sm:p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-brand-border animate-scale-up my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header (Pinned at Top) */}
        <div className="shrink-0 bg-brand-mint/60 border-b border-brand-border p-4 sm:p-5 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-emerald text-white shadow-subtle shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-brand-emerald-deep block">
                Launch-Grade Verification
              </span>
              <h3 id="paywall-title" className="text-base sm:text-lg font-bold text-brand-text">
                Unlock Deep Audit
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessingPayment}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-4">
          {/* Target URL Pill */}
          <div className="bg-slate-50 border border-brand-border rounded-xl p-3 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500 font-sans font-medium">Target URL:</span>
            <span className="text-brand-text font-bold truncate max-w-[220px] sm:max-w-[280px]">
              {targetUrl}
            </span>
          </div>

          {/* Included Features List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">
              Included in Deep Search:
            </h4>
            <div className="grid grid-cols-1 gap-2 text-xs text-brand-text bg-slate-50/60 p-3 rounded-xl border border-slate-100">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-emerald shrink-0 mt-0.5" />
                <span><strong>Multi-page crawler</strong>: Audits up to 10 pages across internal links</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-emerald shrink-0 mt-0.5" />
                <span><strong>Indian DPDP Act 2023</strong>: Notice, consent & privacy compliance</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-emerald shrink-0 mt-0.5" />
                <span><strong>Tracker & script audit</strong>: Identifies data leaks & telemetry</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-emerald shrink-0 mt-0.5" />
                <span><strong>Actionable Code Diffs</strong>: Copy-paste patches for React & Next.js</span>
              </div>
            </div>
          </div>

          {/* Order Summary & Pricing */}
          <div className="bg-brand-mint-dark/40 border border-brand-border rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-brand-text">
              <span>Deep Search Audit (Single Scan)</span>
              <span className="font-mono font-semibold">₹{basePrice}</span>
            </div>

            {couponResult?.valid && (
              <div className="flex items-center justify-between text-xs text-brand-emerald-deep font-semibold">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-brand-emerald" />
                  <span>Coupon ({couponResult.code}) Applied</span>
                </span>
                <span className="font-mono">-₹{discountAmount}</span>
              </div>
            )}

            <div className="pt-2 border-t border-brand-border flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-brand-text">Total Payable:</span>
                <span className="block text-[10px] text-slate-500">Includes all taxes & downloadable reports</span>
              </div>
              <div className="text-right">
                <span className="text-xl font-black font-mono text-brand-emerald-deep">
                  ₹{currentPrice}
                </span>
                {couponResult?.valid && (
                  <span className="block text-[10px] text-slate-400 line-through font-mono">
                    ₹{basePrice}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Coupon Code Input */}
          <div className="pt-1">
            {!couponResult ? (
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value);
                        if (couponError) setCouponError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          handleApplyCoupon(e);
                        }
                      }}
                      placeholder="Enter coupon code"
                      className="w-full text-xs font-mono uppercase px-3 py-2 border border-brand-border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-emerald"
                      disabled={isValidatingCoupon || isProcessingPayment}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleApplyCoupon}
                    disabled={!couponInput.trim() || isValidatingCoupon || isProcessingPayment}
                    className="shrink-0 text-xs"
                  >
                    {isValidatingCoupon ? 'Checking...' : 'Apply'}
                  </Button>
                </div>
                {couponError && (
                  <p className="text-[11px] text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{couponError}</span>
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 rounded-xl">
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Coupon {couponResult.code} applied (-₹{discountAmount})</span>
                </span>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="text-xs text-emerald-700 hover:text-emerald-900 underline font-semibold ml-2"
                  disabled={isProcessingPayment}
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {paymentError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{paymentError}</span>
            </div>
          )}
        </div>

        {/* Modal Actions Footer (Pinned at Bottom) */}
        <div className="shrink-0 p-4 border-t border-brand-border bg-slate-50/90 rounded-b-2xl space-y-2">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isProcessingPayment}
              className="flex-1 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handlePay}
              disabled={isProcessingPayment}
              className="flex-1 text-xs bg-brand-emerald hover:bg-brand-emerald-dark text-white font-bold py-2.5 shadow-subtle flex items-center justify-center gap-2"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>
                {isProcessingPayment ? 'Connecting...' : `Pay ₹${currentPrice} with Razorpay`}
              </span>
            </Button>
          </div>

          {/* Trust Badge */}
          <div className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5 pt-0.5">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>Secured via Razorpay · 256-bit SSL · Instant Dispatch</span>
          </div>
        </div>
      </div>
    </div>
  );
};
