'use client';

import BackButton from '@/app/components/lib/BackButton';
import withoutAuth from '@/app/hoc/withoutAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@heroui/react';

const Page = () => {
  const router = useRouter();
  const params = useSearchParams();
  const mobile = params.get('mobile');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!mobile) {
      router.back();
    }
  }, [mobile, router]);

  const handleSendOtp = async () => {
    setLoading(true);
    // OTP logic here
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md">
      <BackButton showLabel />

      <div className="mt-4 flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Verify your number</h1>
          <p className="text-default-500 text-sm mt-1">We will send an OTP to the number below</p>
        </div>

        <div className="bg-default-100 p-4 rounded-2xl flex justify-between items-center border border-default-200">
          <div>
            <p className="text-[10px] text-default-400 uppercase font-bold tracking-wider">
              Mobile Number
            </p>
            <p className="text-lg font-semibold">{mobile}</p>
          </div>
        </div>

        <Button
          color="primary"
          size="lg"
          className="font-bold"
          isLoading={loading}
          onPress={handleSendOtp}
          fullWidth
        >
          Send OTP
        </Button>

        <p className="text-center text-xs text-default-400 px-4 leading-relaxed">
          By tapping Send OTP, you agree to receive a verification SMS. Message and data rates may
          apply.
        </p>
      </div>
    </div>
  );
};

export default withoutAuth(Page);
