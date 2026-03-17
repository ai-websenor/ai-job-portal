import APP_CONFIG from '@/app/config/config';
import { DialogProps } from '@/app/types/types';
import { addToast, Button, Modal, ModalBody, ModalContent, ModalHeader } from '@heroui/react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useState } from 'react';
import routePaths from '@/app/config/routePaths';

const stripePromise = loadStripe(APP_CONFIG.STRIPE_PUBLISHABLE_KEY!);

interface Props extends DialogProps {
  clientSecret: string;
  currency: string;
  amount: number;
  orderId: string;
  paymentId: string;
}

const CheckoutForm = ({ amount, currency, orderId, paymentId }: any) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}${routePaths.payment.success}?orderId=${orderId}&paymentId=${paymentId}`,
      },
    });

    if (error) {
      addToast({
        title: 'Oops',
        color: 'danger',
        description: error.message ?? 'Something went wrong, please try again later.',
      });
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button
        type="submit"
        color="primary"
        fullWidth
        isLoading={isProcessing}
        disabled={!stripe || !elements}
      >
        Pay {(amount / 100).toLocaleString()} {currency.toUpperCase()}
      </Button>
    </form>
  );
};

const StripePaymentModal = ({
  isOpen,
  onClose,
  clientSecret,
  currency,
  amount,
  orderId,
  paymentId,
}: Props) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">Complete Payment</ModalHeader>
        <ModalBody className="pb-8">
          {clientSecret && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm
                amount={amount}
                currency={currency}
                orderId={orderId}
                paymentId={paymentId}
              />
            </Elements>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default StripePaymentModal;
