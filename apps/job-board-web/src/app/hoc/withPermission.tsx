'use client';

import { useRouter } from 'next/navigation';
import { ComponentType, useEffect, useState } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import routePaths from '../config/routePaths';
import useUserStore from '../store/useUserStore';
import { Roles } from '../types/enum';
import permissionUtils from '../utils/permissionUtils';

/**
 * Guards a page behind authentication AND a specific company permission.
 *
 * Mirrors withAuth (token + candidate onboarding checks), then verifies the
 * logged-in employer holds `permission`. Non-employer roles (e.g. super_employer)
 * bypass the permission check via permissionUtils. When the employer lacks the
 * permission, an inline "no access" notice is shown instead of redirecting —
 * this avoids redirect loops when the fallback page is itself gated.
 */
function withPermission<P extends object>(WrappedComponent: ComponentType<P>, permission: string) {
  return function WithPermission(props: P) {
    const router = useRouter();
    const { getLocalStorage } = useLocalStorage();
    const { user } = useUserStore();
    const authUser = user as any;
    const [isChecking, setIsChecking] = useState<boolean>(true);

    useEffect(() => {
      const token = getLocalStorage('token');
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

    if (!permissionUtils.hasPermission(permission)) {
      return (
        <div className="container mx-auto py-20 px-4 md:px-6">
          <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <h2 className="text-xl font-bold text-gray-700">Access restricted</h2>
            <p className="text-gray-400 font-medium mt-2">
              You don&apos;t have permission to view this page. Contact your account owner to
              request access.
            </p>
          </div>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
}

export default withPermission;
