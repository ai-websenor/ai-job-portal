'use client';

import { useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import Footer from '../layouts/Footer';
import MainHeader from '../layouts/MainHeader';
import useGetProfile from '../hooks/useGetProfile';
import SplashScreen from '../components/lib/SplashScreen';
import useUserStore from '../store/useUserStore';
import { useRouter } from 'next/navigation';
import routePaths from '../config/routePaths';
import { Roles } from '../types/enum';
import useFirebase from '../hooks/useFirebase';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useUserStore();
  const { initFirebase } = useFirebase();

  const { getLocalStorage } = useLocalStorage();
  const token = getLocalStorage('token');
  const fcmToken = getLocalStorage('fcmToken');

  const { getProfile, loading: profileLoading } = useGetProfile();

  useEffect(() => {
    if (token) {
      if (user?.role === Roles.candidate && !user?.isOnboardingCompleted) {
        router.push(
          user?.role === Roles.candidate
            ? routePaths.auth.onboarding
            : routePaths.employee.auth.onboarding,
        );
      }

      getProfile();

      if (!fcmToken) {
        initFirebase();
      }
    }
  }, [token]);

  if (profileLoading) {
    return <SplashScreen />;
  }

  return (
    <div className="main">
      <MainHeader />
      <div className="min-h-[500px]">{children}</div>
      {!token && <Footer />}
    </div>
  );
}
