"use client";

import { useEffect } from "react";
import useLocalStorage from "../hooks/useLocalStorage";
import Footer from "../layouts/Footer";
import MainHeader from "../layouts/MainHeader";
import useGetProfile from "../hooks/useGetProfile";
import SplashScreen from "../components/lib/SplashScreen";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { getLocalStorage } = useLocalStorage();
  const token = getLocalStorage("token");
  const { getProfile, loading: profileLoading } = useGetProfile();

  useEffect(() => {
    if (token) {
      getProfile();
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
