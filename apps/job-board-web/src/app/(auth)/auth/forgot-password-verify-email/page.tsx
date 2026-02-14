"use client";

import BackButton from "@/app/components/lib/BackButton";
import SplashScreen from "@/app/components/lib/SplashScreen";
import routePaths from "@/app/config/routePaths";
import withoutAuth from "@/app/hoc/withoutAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import ForgotPasswordEmailVerifyForm from "./ForgotPasswordEmailVerifyForm";

const ForgotPasswordVerifyEmailContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  useEffect(() => {
    if (!email) {
      router.push(routePaths.auth.login);
    }
  }, [email, router]);

  return (
    <div className="w-full">
      <BackButton showLabel />
      <div className="font-bold text-4xl mt-3">Email Verification</div>
      <div className="text-gray-700 text-lg my-3">
        We’ve sent an verification to <b className="font-bold">{email}</b> to
        verify your email address and activate your account
      </div>
      <ForgotPasswordEmailVerifyForm />
    </div>
  );
};

function ForgotPasswordVerifyEmailPage() {
  return (
    <Suspense fallback={<SplashScreen />}>
      <ForgotPasswordVerifyEmailContent />
    </Suspense>
  );
}

export default withoutAuth(ForgotPasswordVerifyEmailPage);
