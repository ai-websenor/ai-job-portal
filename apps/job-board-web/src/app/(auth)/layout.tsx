"use client";

import clsx from "clsx";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import routePaths from "../config/routePaths";
import useUserStore from "../store/useUserStore";
import { Roles } from "../types/enum";

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUserStore();
  const authUser = user as any;
  const [isChecking, setIsChecking] = useState(true);

  const isOnboarding =
    pathname === routePaths.auth.onboarding ||
    pathname === routePaths.employee.auth.onboarding;

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      setIsChecking(false);
      return;
    }

    const isCandidateOnboarding = pathname === routePaths.auth.onboarding;
    const isEmployerOnboarding = pathname === routePaths.employee.auth.onboarding;
    const isCandidateAuthPath = pathname.startsWith('/auth');
    const isEmployerAuthPath = pathname.startsWith('/employee/auth');
    const isOnboardingCompleted =
      Boolean(authUser?.isOnboardingCompleted) ||
      localStorage.getItem('isOnboardingCompleted') === 'true';

    if (authUser?.role === Roles.candidate) {
      if (isOnboardingCompleted) {
        router.replace(routePaths.dashboard);
        return;
      }

      if (isCandidateAuthPath && !isCandidateOnboarding) {
        router.replace(`${routePaths.auth.onboarding}?step=${authUser?.onboardingStep || 1}`);
        return;
      }
    }

    if (
      authUser?.role &&
      authUser?.role !== Roles.candidate &&
      (isCandidateAuthPath || isEmployerAuthPath)
    ) {
      router.replace(
        isEmployerOnboarding
          ? `${routePaths.employee.profile}?tab=2`
          : routePaths.employee.candidates.search,
      );
      return;
    }

    setIsChecking(false);
  }, [authUser?.isOnboardingCompleted, authUser?.onboardingStep, authUser?.role, pathname, router]);

  if (isChecking) {
    return null;
  }

  return (
    <div className="h-screen flex bg-white overflow-hidden">
      <div className={clsx('w-full h-full overflow-y-auto scrollbar-hide', 'lg:w-1/2')}>
        <div
          className={clsx(
            "mx-auto py-10 px-10 flex items-center w-full max-w-3xl",
            {
              "h-full":
                !isOnboarding &&
                pathname !== routePaths.auth.signup &&
                pathname !== routePaths.auth.login,
              "h-auto 2xl:h-full": pathname === routePaths.auth.login,
            },
          )}
        >
          {children}
        </div>
      </div>
      <div className={clsx('relative hidden lg:block p-4 h-full', 'w-1/2')}>
        <div className="relative h-full w-full overflow-hidden rounded-3xl">
          <Image
            src="/assets/images/auth-bg.png"
            alt="Auth background"
            fill
            priority
            className="object-cover"
          />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
