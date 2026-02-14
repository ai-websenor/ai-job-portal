"use client";

import { useRouter } from "next/navigation";
import { ComponentType, useEffect, useState } from "react";
import useLocalStorage from "../hooks/useLocalStorage";
import routePaths from "../config/routePaths";

function withAuth<P extends object>(WrappedComponent: ComponentType<P>) {
  return function withAuth(props: P) {
    const router = useRouter();
    const { getLocalStorage } = useLocalStorage();
    const [isChecking, setIsChecking] = useState<boolean>(true);

    useEffect(() => {
      const token = getLocalStorage("token");

      if (!token) {
        router.replace(routePaths.auth.login);
      } else {
        setIsChecking(false);
      }
    }, [router]);

    if (isChecking) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}

export default withAuth;
