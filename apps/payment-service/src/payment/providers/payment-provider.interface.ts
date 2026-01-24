export interface CreateOrderParams {
  amount: number; // in smallest currency unit (paise/cents)
  currency: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface OrderResult {
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  provider: 'razorpay' | 'stripe';
  providerData: Record<string, any>;
}

export interface VerifyPaymentParams {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface RefundParams {
  paymentId: string;
  amount?: number; // partial refund if specified
  reason?: string;
}

export interface RefundResult {
  refundId: string;
  paymentId: string;
  amount: number;
  status: string;
}

export interface PaymentProvider {
  readonly name: 'razorpay' | 'stripe';

  createOrder(params: CreateOrderParams): Promise<OrderResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<boolean>;
  refund(params: RefundParams): Promise<RefundResult>;
  getPaymentDetails(paymentId: string): Promise<Record<string, any>>;
}
