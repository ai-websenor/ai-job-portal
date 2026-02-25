"use client";

import BackButton from "@/app/components/lib/BackButton";
import routePaths from "@/app/config/routePaths";
import withoutAuth from "@/app/hoc/withoutAuth";
import { Button } from "@heroui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaRegBuilding } from "react-icons/fa";
import LoginForm from "./LoginForm";
import SSOButtons from "@/app/components/lib/SSOButtons";
import { Roles } from "@/app/types/enum";

const page = () => {
  const router = useRouter();

  return (
    <div className="w-full">
      <BackButton showLabel />
      <h1 className="font-bold text-4xl my-3">Welcome Back 👋</h1>
      <p className="text-gray-700 text-lg mb-7">
        Today is a new day. It's your day. You shape it. <br /> Log in to start
        managing your jobs.
      </p>

      <LoginForm />

      <SSOButtons role={Roles.candidate} />

      <div className="my-5 text-center">
        Don't you have an account?{" "}
        <Link
          href={routePaths.auth.signup}
          className="font-medium text-primary"
        >
          Sign up
        </Link>
      </div>

      <Button
        size="lg"
        className="w-full rounded-xl"
        endContent={<FaRegBuilding size={16} />}
        onPress={() => router.push(routePaths.employee.auth.login)}
      >
        Login as Employer
      </Button>
    </div>
  );
};

export default withoutAuth(page);
