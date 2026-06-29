"use client";

import { useRouter } from "next/navigation";
import { ComponentType, useEffect, useState } from "react";
import useLocalStorage from "../hooks/useLocalStorage";
import routePaths from "../config/routePaths";
import useUserStore from "../store/useUserStore";
import { Roles } from "../types/enum";

function withAuth<P extends object>(WrappedComponent: ComponentType<P>) {
  return function withAuth(props: P) {
    const router = useRouter();
    const { getLocalStorage } = useLocalStorage();
    const { user } = useUserStore();
    const authUser = user as any;
    const [isChecking, setIsChecking] = useState<boolean>(true);

    useEffect(() => {
      const token = getLocalStorage("token");
      const isOnboardingCompleted =
        Boolean(authUser?.isOnboardingCompleted) ||
        getLocalStorage('isOnboardingCompleted') === 'true';

      if (!token) {
        router.replace(routePaths.auth.login);
      } else if (authUser?.role === Roles.candidate && !isOnboardingCompleted) {
        router.replace(`${routePaths.auth.onboarding}?step=${authUser?.onboardingStep || 1}`);
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

export default withAuth;
