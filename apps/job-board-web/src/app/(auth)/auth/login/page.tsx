"use client";

import BackButton from "@/app/components/lib/BackButton";
import routePaths from "@/app/config/routePaths";
import withoutAuth from "@/app/hoc/withoutAuth";
import { Button } from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaRegBuilding } from "react-icons/fa";
import LoginForm from "./LoginForm";

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

      <div className="mt-5 grid gap-5">
        {ssoButtons.map((item, idx) => (
          <Button
            key={idx}
            className="bg-[#F0F7F9] text-[#11181C] font-medium h-14"
            radius="lg"
            variant="flat"
            startContent={
              <Image src={item.icon} width={20} height={20} alt={item.label} />
            }
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="my-5 text-lg text-center">
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

const ssoButtons = [
  {
    icon: "/assets/images/google-icon.png",
    label: "Sign in with Google",
  },
  {
    icon: "/assets/images/apple-icon.png",
    label: "Sign in with Apple",
  },
];
