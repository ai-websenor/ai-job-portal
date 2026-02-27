'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import routePaths from '@/app/config/routePaths';
import useFirebase from '@/app/hooks/useFirebase';
import useLocalStorage from '@/app/hooks/useLocalStorage';
import useUserStore from '@/app/store/useUserStore';
import { Roles } from '@/app/types/enum';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

const page = () => {
  const router = useRouter();
  const hasFetched = useRef(false);
  const { setUser } = useUserStore();
  const searchParams = useSearchParams();
  const { initFirebase } = useFirebase();
  const { setLocalStorage } = useLocalStorage();

  useEffect(() => {
    const code = searchParams.get('code');
    const stateParam = searchParams.get('state');

    if (code && !hasFetched.current) {
      hasFetched.current = true;
      handleCallback(code, stateParam);
    }
  }, [searchParams]);

  const handleCallback = async (code: string, stateParam: string | null) => {
    try {
      let role = Roles.candidate;
      if (stateParam) {
        try {
          const state = JSON.parse(decodeURIComponent(stateParam));
          role = state.role || Roles.candidate;
        } catch (e) {
          console.error('State parse error', e);
        }
      }

      const redirectUri = `${window.location.origin}${routePaths.auth.googleCallback}`;

      const response = await http.post(ENDPOINTS.SSO.GOOGLE_CALLBACK, {
        code,
        redirectUri,
        role,
      });

      if (response?.data?.data) {
        const { accessToken, refreshToken, user } = response.data.data;

        setLocalStorage('token', accessToken);
        setLocalStorage('refreshToken', refreshToken);

        setUser({
          ...user,
          role,
          isOnboardingCompleted: user?.isOnboardingCompleted,
        });

        if (!user?.isVerified) {
          const url =
            role === Roles.candidate
              ? routePaths.auth.verifyEmail
              : routePaths.employee.auth.emailOtp;

          router.push(`${url}?email=${user?.email}`);
          return;
        }

        if (!user?.isOnboardingCompleted) {
          router.push(
            role === Roles.candidate
              ? `${routePaths.auth.onboarding}?step=${user?.onboardingStep || 1}`
              : routePaths.employee.auth.onboarding,
          );
          return;
        }

        await initFirebase();

        router.push(
          role === Roles.candidate ? routePaths.dashboard : routePaths.employee.dashboard,
        );
      }
    } catch (error) {
      console.error('Login failed:', error);
      router.push(routePaths.auth.login);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4 mx-auto"></div>
      <p className="text-gray-600 font-medium">Signing you in, please wait...</p>
    </div>
  );
};

export default page;
