"use client";

import { HeroUIProvider, ToastProvider } from "@heroui/react";
import ScrollToTop from "../components/lib/ScrollToTop";
import NextTopLoader from "nextjs-toploader";
import { MainDrawerProvider } from "../context/MainDrawerContext";
import NoInternet from "../components/lib/NoInternet";
import { useEffect, useState } from "react";

const Providers = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <HeroUIProvider>
      <MainDrawerProvider>
        {children}
        <ToastProvider placement="top-right" />
        {mounted && (
          <>
            <ScrollToTop />
            <NextTopLoader color="#7c66f5" showSpinner={false} />
            <NoInternet />
          </>
        )}
      </MainDrawerProvider>
    </HeroUIProvider>
  );
};

export default Providers;
