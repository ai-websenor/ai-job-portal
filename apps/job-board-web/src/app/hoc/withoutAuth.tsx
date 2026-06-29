'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, ComponentType } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import routePaths from '../config/routePaths';
import useUserStore from '../store/useUserStore';
import { Roles } from '../types/enum';

function withoutAuth<P extends object>(WrappedComponent: ComponentType<P>) {
  return function WithoutAuth(props: P) {
    const router = useRouter();
    const { user } = useUserStore();
    const authUser = user as any;
    const { getLocalStorage } = useLocalStorage();
    const [isChecking, setIsChecking] = useState<boolean>(true);

    useEffect(() => {
      const token = getLocalStorage('token');
      const isOnboardingCompleted =
        Boolean(authUser?.isOnboardingCompleted) ||
        getLocalStorage('isOnboardingCompleted') === 'true';

      if (token && user) {
        if (authUser?.role === Roles.candidate && !isOnboardingCompleted) {
          router.replace(`${routePaths.auth.onboarding}?step=${authUser?.onboardingStep || 1}`);
          return;
        }

        router.replace(
          user?.role === Roles.candidate
            ? routePaths.dashboard
            : routePaths.employee.candidates.search,
        );
      } else {
        setIsChecking(false);
      }
    }, [authUser?.isOnboardingCompleted, authUser?.onboardingStep, authUser?.role, router]);

    if (isChecking) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}

export default withoutAuth;
