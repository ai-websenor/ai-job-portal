'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, Button, Progress } from '@heroui/react';
import { HiCheckCircle, HiArrowRight } from 'react-icons/hi2';
import { motion } from 'framer-motion';
import routePaths from '@/app/config/routePaths';

const PaymentSuccessPage = () => {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push(routePaths.employee.plans.history);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="flex items-center justify-center p-5">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card shadow="sm" className="border-none bg-white/80 backdrop-blur-md">
          <CardBody className="p-8 flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mb-6"
            >
              <HiCheckCircle className="text-success w-24 h-24" />
            </motion.div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
            <p className="text-gray-500 mb-8">
              Thank you for your purchase. Your subscription has been activated successfully.
            </p>

            <div className="w-full space-y-4 mb-8">
              <div className="flex justify-between text-sm text-gray-500 mb-1">
                <span>Redirecting to history</span>
                <span className="font-medium text-primary">{countdown}s</span>
              </div>
              <Progress
                aria-label="Redirecting..."
                size="sm"
                value={(5 - countdown) * 20}
                color="primary"
                className="max-w-md"
              />
            </div>

            <Button
              color="primary"
              variant="shadow"
              size="lg"
              className="w-full font-semibold"
              onPress={() => router.push('/employee/plans/history')}
              endContent={<HiArrowRight className="w-5 h-5" />}
            >
              Go to Subscription History
            </Button>

            <p className="mt-6 text-xs text-gray-400">
              If you are not redirected automatically, click the button above.
            </p>
          </CardBody>
        </Card>
      </motion.div>
    </div>
  );
};

export default PaymentSuccessPage;
