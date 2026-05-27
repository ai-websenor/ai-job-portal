'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import routePaths from '@/app/config/routePaths';
import VerifyEmailForm from './VerifyEmailForm';
import withoutAuth from '@/app/hoc/withoutAuth';
import SplashScreen from '@/app/components/lib/SplashScreen';

const VerifyEmailContent = () => {
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
      <VerifyEmailForm />
    </div>
  );
};

function VerifyEmailPage() {
  return (
    <Suspense fallback={<SplashScreen />}>
      <VerifyEmailContent />
    </Suspense>
  );
}

export default withoutAuth(VerifyEmailPage);
