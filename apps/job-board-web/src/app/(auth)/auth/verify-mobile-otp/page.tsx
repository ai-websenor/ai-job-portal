'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import VerifyMobileOtpForm from './VerifyMobileOtpForm';
import routePaths from '@/app/config/routePaths';

const Page = () => {
  const router = useRouter();
  const params = useSearchParams();
  const mobile = params.get('mobile');

  useEffect(() => {
    if (!mobile) {
      router.replace(routePaths.auth.login);
    }
  }, [mobile, router]);

  return (
    <div className="w-full">
      <VerifyMobileOtpForm />
    </div>
  );
};

export default Page;
