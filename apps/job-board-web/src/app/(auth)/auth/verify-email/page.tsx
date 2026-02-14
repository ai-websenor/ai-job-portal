"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import routePaths from "@/app/config/routePaths";
import VerifyEmailForm from "./VerifyEmailForm";
import withoutAuth from "@/app/hoc/withoutAuth";
import SplashScreen from "@/app/components/lib/SplashScreen";
import BackButton from "@/app/components/lib/BackButton";

const VerifyEmailContent = () => {
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
      <VerifyEmailForm />
    </div>
  );
};

function VerifyEmailPage() {
  return (
    <Suspense fallback={<SplashScreen />}>
      <VerifyEmailContent />
    </Suspense>
  );
}

export default withoutAuth(VerifyEmailPage);
