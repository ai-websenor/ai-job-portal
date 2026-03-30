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
import socket from '../socket';
import { themeColors } from '../config/data';
import CommonUtils from '../utils/commonUtils';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useUserStore();
  const { initFirebase } = useFirebase();
  const { getLocalStorage, setLocalStorage } = useLocalStorage();

  const token = getLocalStorage('token');
  const fcmToken = getLocalStorage('fcmToken');
  const currentThemeJson = getLocalStorage('app-theme');
  const currentTheme = currentThemeJson ? JSON.parse(currentThemeJson) : themeColors[0];

  const { getProfile, loading: profileLoading } = useGetProfile();

  useEffect(() => {
    if (token) {
      if (user?.role === Roles.candidate) {
        router.push(routePaths.auth.onboarding);
      }

      getProfile();

      if (!fcmToken) {
        initFirebase();
      }

      if (currentTheme) {
        CommonUtils.applyTheme(currentTheme);
        setLocalStorage('app-theme', JSON.stringify(currentTheme));
      } else {
        CommonUtils.applyTheme(themeColors[0]);
        setLocalStorage('app-theme', JSON.stringify(themeColors[0]));
      }
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      socket.connect(token);

      return () => socket.disconnect();
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
