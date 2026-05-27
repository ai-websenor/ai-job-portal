'use client';

import SplashScreen from '@/app/components/lib/SplashScreen';
import routePaths from '@/app/config/routePaths';
import withoutAuth from '@/app/hoc/withoutAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import ForgotPasswordEmailVerifyForm from './ForgotPasswordEmailVerifyForm';

const ForgotPasswordVerifyEmailContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  useEffect(() => {
    if (!email) {
      router.push(routePaths.auth.login);
    }
  }, [email, router]);

  return (
    <div className="w-full">
      <ForgotPasswordEmailVerifyForm />
    </div>
  );
};

function ForgotPasswordVerifyEmailPage() {
  return (
    <Suspense fallback={<SplashScreen />}>
      <ForgotPasswordVerifyEmailContent />
    </Suspense>
  );
}

export default withoutAuth(ForgotPasswordVerifyEmailPage);
