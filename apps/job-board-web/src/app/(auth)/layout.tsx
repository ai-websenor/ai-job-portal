"use client";

import clsx from "clsx";
import Image from "next/image";
import { usePathname } from "next/navigation";
import routePaths from "../config/routePaths";

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  const isOnboarding =
    pathname === routePaths.auth.onboarding ||
    pathname === routePaths.employee.auth.onboarding;

  return (
    <div className="h-screen flex bg-white overflow-hidden">
      <div
        className={clsx("w-full h-full overflow-y-auto scrollbar-hide", {
          "lg:w-[70%]": isOnboarding,
          "lg:w-1/2": !isOnboarding,
        })}
      >
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
      <div
        className={clsx("relative hidden lg:block p-4 h-full", {
          "w-[30%]": isOnboarding,
          "w-1/2": !isOnboarding,
        })}
      >
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
