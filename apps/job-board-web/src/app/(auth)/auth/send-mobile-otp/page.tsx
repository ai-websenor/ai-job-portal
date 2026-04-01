'use client';

import BackButton from '@/app/components/lib/BackButton';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { addToast, Button } from '@heroui/react';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import routePaths from '@/app/config/routePaths';
import PhoneNumberInput from '@/app/components/form/PhoneNumberInput';

const page = () => {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [mobile, setMobile] = useState(params.get('mobile') || '');

  const handleSendOtp = async () => {
    const payload = { mobile: params.get('mobile') ? `+${mobile?.trim()}` : mobile };
    try {
      setLoading(true);
      await http.post(ENDPOINTS.AUTH.SEND_MOBILE_OTP, payload);
      router.push(`${routePaths.auth.verifyMobileOtp}?mobile=${mobile}`);
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
    <div className="w-full max-w-md">
      <BackButton showLabel />

      <div className="mt-4 flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {params.get('mobile') ? 'Verify' : 'Enter'} your number
          </h1>
          <p className="text-default-500 text-sm mt-1">We will send an OTP to the number below</p>
        </div>

        {params?.get('mobile') ? (
          <div className="bg-default-100 py-3 px-4 rounded-2xl flex justify-between items-center border border-default-200">
            <div>
              <p className="text-[10px] text-default-400 uppercase font-bold tracking-wider">
                Mobile Number
              </p>
              <p className="text-lg font-semibold">+{mobile?.trim()}</p>
            </div>
          </div>
        ) : (
          <PhoneNumberInput value={mobile} onChange={(ev) => setMobile(ev)} />
        )}

        <Button
          color="primary"
          size="lg"
          className="font-bold"
          isLoading={loading}
          onPress={handleSendOtp}
          fullWidth
          disabled={!mobile?.trim()}
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

export default page;
