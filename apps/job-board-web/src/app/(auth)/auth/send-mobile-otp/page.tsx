'use client';

import BackButton from '@/app/components/lib/BackButton';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { addToast, Button } from '@heroui/react';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import routePaths from '@/app/config/routePaths';
import PhoneNumberInput from '@/app/components/form/PhoneNumberInput';
import { motion } from 'framer-motion';
import Image from 'next/image';

const page = () => {
  const router = useRouter();
  const params = useSearchParams();
  const hasPrefilledMobile = !!params.get('mobile');
  const [loading, setLoading] = useState(false);
  const [mobile, setMobile] = useState(params.get('mobile') || '');

  const handleSendOtp = async () => {
    const mobileNumber = hasPrefilledMobile ? `+${mobile?.trim()}` : mobile;
    const payload = { mobile: mobileNumber };

    try {
      setLoading(true);

      if (!hasPrefilledMobile) {
        await http.put(ENDPOINTS.CANDIDATE.UPDATE_PROFILE, payload);
      }

      await http.post(ENDPOINTS.AUTH.SEND_MOBILE_OTP, payload);

      router.replace(`${routePaths.auth.verifyMobileOtp}?mobile=${mobile}`);

      addToast({
        title: 'Success',
        color: 'success',
        description: 'OTP sent successfully',
      });
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="w-full max-w-xl mx-auto py-4 sm:py-0">
      <div className="mb-9 sm:mb-16">
        <Image
          src="/assets/images/logo.svg"
          alt="Logo"
          width={48}
          height={48}
          priority
          className="h-11 w-11 sm:h-12 sm:w-12 object-contain"
        />
      </div>

      <div className="w-full">
      <BackButton showLabel />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-4 flex w-full max-w-xl flex-col gap-6"
      >
        <div>
          <h1 className="font-bold text-4xl my-2">{hasPrefilledMobile ? 'Verify' : 'Enter'} your number</h1>
          <p className="text-gray-700 text-lg">We will send an OTP to the number below</p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground-600">Mobile Number</label>
          <PhoneNumberInput
            value={mobile}
            onChange={(ev) => setMobile(ev)}
            placeholder="9834567890"
            disabled={loading || hasPrefilledMobile}
          />
        </div>

        <Button
          color="primary"
          size="lg"
          radius="sm"
          className="h-12 font-bold text-lg bg-primary hover:bg-primary/80"
          isLoading={loading}
          onPress={handleSendOtp}
          fullWidth
          disabled={!mobile?.trim()}
        >
          Send OTP
        </Button>

        <p className="text-center text-sm text-gray-500 px-2 leading-relaxed">
          By tapping Send OTP, you agree to receive a verification SMS. Message and data rates may
          apply.
        </p>
      </motion.div>
      </div>
    </section>
  );
};

export default page;
