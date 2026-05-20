'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import VerifyMobileOtpForm from './VerifyMobileOtpForm';

const Page = () => {
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
      <VerifyMobileOtpForm />
    </div>
  );
};

export default Page;
