'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import VerifyMobileOtpForm from './VerifyMobileOtpForm';
import BackButton from '@/app/components/lib/BackButton';

const page = () => {
  const router = useRouter();
  const params = useSearchParams();
  const mobile = params.get('mobile');

  useEffect(() => {
    if (!mobile) {
      router.back();
    }
  }, [mobile, router]);

  return (
    <div className="w-full">
      <BackButton showLabel />
      <div className="font-bold text-4xl mt-3">Mobile Verification</div>
      <div className="text-gray-700 text-lg my-3">
        We’ve sent an verification to <b className="font-bold">+{mobile}</b> to verify your mobile
        number and activate your account
      </div>
      <VerifyMobileOtpForm />
    </div>
  );
};

export default page;
