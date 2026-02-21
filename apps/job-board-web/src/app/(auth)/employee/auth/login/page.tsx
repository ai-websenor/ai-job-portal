"use client";

import BackButton from "@/app/components/lib/BackButton";
import LoginForm from "./LoginForm";
import Link from "next/link";
import routePaths from "@/app/config/routePaths";

const page = () => {
  return (
    <div className="w-full">
      <BackButton showLabel />
      <h1 className="font-bold text-4xl my-3">Welcome Back 👋</h1>
      <p className="text-gray-700 text-lg mb-7">
        Today is a new day. It's your day. You shape it. <br /> Log in to start
        managing your jobs.
      </p>
      <LoginForm />
      <div className="my-5 text-center">
        Don't you have an account?{" "}
        <Link
          href={routePaths.employee.auth.signup}
          className="font-medium text-primary"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
};

export default page;
