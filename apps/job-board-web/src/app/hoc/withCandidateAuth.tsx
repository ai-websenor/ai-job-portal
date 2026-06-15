'use client';

import routePaths from '@/app/config/routePaths';
import useLocalStorage from '@/app/hooks/useLocalStorage';
import useUserStore from '@/app/store/useUserStore';
import { Roles } from '@/app/types/enum';
import { useRouter } from 'next/navigation';
import { ComponentType, useEffect, useState } from 'react';
import withAuth from './withAuth';

function withCandidateAuth<P extends object>(WrappedComponent: ComponentType<P>) {
  const AuthenticatedComponent = withAuth(WrappedComponent);

  return function CandidateAuth(props: P) {
    const router = useRouter();
    const { getLocalStorage } = useLocalStorage();
    const { user } = useUserStore();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
      const token = getLocalStorage('token');
      const role = user?.role;

      if (!token) {
        setIsChecking(false);
        return;
      }

      if (role && role !== Roles.candidate) {
        router.replace(routePaths.employee.dashboard);
        return;
      }

      setIsChecking(false);
    }, [getLocalStorage, router, user?.role]);

    if (isChecking) {
      return null;
    }

    return <AuthenticatedComponent {...props} />;
  };
}

export default withCandidateAuth;
