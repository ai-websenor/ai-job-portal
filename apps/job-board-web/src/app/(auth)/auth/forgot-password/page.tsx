"use client";

import routePaths from "@/app/config/routePaths";
import withoutAuth from "@/app/hoc/withoutAuth";
import Link from "next/link";
import ForgotPasswordForm from "./ForgotPasswordForm";

const page = () => {
  return (
    <div className="w-full">
      <h1 className="font-bold text-4xl my-3">Forgot Password</h1>
      <p className="text-gray-500 text-sm font-medium">
        Go back to{" "}
        <Link href={routePaths.auth.login} className="text-primary">
          Sign In
        </Link>
      </p>
      <p className="text-gray-500 text-sm font-medium mt-1 mb-5">
        Don't have an account{" "}
        <Link href={routePaths.auth.signup} className="text-primary">
          Create Account
        </Link>
      </p>

      <ForgotPasswordForm />
    </div>
  );
};

export default withoutAuth(page);
