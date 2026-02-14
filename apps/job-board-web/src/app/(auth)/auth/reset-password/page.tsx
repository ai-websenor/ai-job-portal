"use client";

import BackButton from "@/app/components/lib/BackButton";
import routePaths from "@/app/config/routePaths";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import ResetPasswordForm from "./ResetPasswordForm";
import SplashScreen from "@/app/components/lib/SplashScreen";

const ResetPasswordContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetPasswordToken = searchParams.get("resetPasswordToken");

  useEffect(() => {
    if (!resetPasswordToken) {
      router.push(routePaths.auth.login);
    }
  }, []);

  return (
    <div className="w-full">
      <BackButton showLabel />
      <div className="font-bold text-4xl mt-3">Reset Password</div>
      <div className="text-gray-700 text-lg my-3">
        Reset your password to regain access to your account.
      </div>
      <ResetPasswordForm />
    </div>
  );
};

function ResetPasswordPage() {
  return (
    <Suspense fallback={<SplashScreen />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

export default ResetPasswordPage;
