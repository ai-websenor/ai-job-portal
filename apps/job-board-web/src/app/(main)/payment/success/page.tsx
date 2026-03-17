'use client';

import { Card, CardBody, CircularProgress } from '@heroui/react';
import { HiCheckCircle } from 'react-icons/hi2';
import { motion } from 'framer-motion';
import withAuth from '@/app/hoc/withAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import routePaths from '@/app/config/routePaths';

const page = () => {
  const router = useRouter();
  const params = useSearchParams();
  const orderId = params.get('orderId');
  const paymentId = params.get('paymentId');

  useEffect(() => {
    if (orderId && paymentId) {
      verifyPayment();
    } else {
      router.back();
    }
  }, []);

  const verifyPayment = async () => {
    try {
      await http.post(ENDPOINTS.SUBSCRIPTIONS.VERIFY_PAYMENT, {
        orderId,
        paymentId,
        provider: 'stripe',
      });
      setTimeout(() => {
        router.push(routePaths.employee.plans.history);
      }, 3000);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <>
      <title>Payment Successful</title>
      <div className="flex items-center justify-center p-5 h-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full h-full max-w-xl"
        >
          <Card shadow="sm" className="border-none bg-white/80 backdrop-blur-md">
            <CardBody className="p-8 flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  delay: 0.2,
                  type: 'spring',
                  stiffness: 260,
                  damping: 20,
                }}
                className="mb-6"
              >
                <HiCheckCircle className="text-success w-24 h-24" />
              </motion.div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
              <p className="text-gray-500 text-sm mb-8">
                Thank you for your purchase. Your subscription has been activated successfully.
              </p>
              <CircularProgress />
            </CardBody>
          </Card>
        </motion.div>
      </div>
    </>
  );
};

export default withAuth(page);
