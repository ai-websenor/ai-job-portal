"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, ComponentType } from "react";
import useLocalStorage from "../hooks/useLocalStorage";
import routePaths from "../config/routePaths";
import useUserStore from "../store/useUserStore";
import { Roles } from "../types/enum";

function withoutAuth<P extends object>(WrappedComponent: ComponentType<P>) {
  return function WithoutAuth(props: P) {
    const router = useRouter();
    const { user } = useUserStore();
    const { getLocalStorage } = useLocalStorage();
    const [isChecking, setIsChecking] = useState<boolean>(true);

    useEffect(() => {
      const token = getLocalStorage("token");

      if (token) {
        router.replace(
          user?.role === Roles.candidate
            ? routePaths.dashboard
            : routePaths.employee.dashboard,
        );
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

export default withoutAuth;
