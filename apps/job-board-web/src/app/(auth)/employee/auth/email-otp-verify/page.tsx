"use client";

import routePaths from "@/app/config/routePaths";
import Link from "next/link";
import EmailOtpVerifyForm from "./EmailOtpVerifyForm";

const page = () => {
  return (
    <div className="w-full">
      <h1 className="font-bold text-4xl mt-3">Enter OTP</h1>
      <p className="text-gray-700 mb-3">
        Go back to{" "}
        <Link href={routePaths.employee.auth.login} className="font-semibold">
          Sign In
        </Link>
      </p>
      <EmailOtpVerifyForm />
    </div>
  );
};

export default page;
