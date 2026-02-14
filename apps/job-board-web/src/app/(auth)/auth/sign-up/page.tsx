"use client";

import Image from "next/image";
import SignupForm from "./SignupForm";
import { Button } from "@heroui/react";
import Link from "next/link";
import routePaths from "@/app/config/routePaths";
import withoutAuth from "@/app/hoc/withoutAuth";
import BackButton from "@/app/components/lib/BackButton";

const page = () => {
  return (
    <div className="w-full">
      <BackButton showLabel />
      <h1 className="font-bold text-4xl my-3">Create an account</h1>
      <p className="text-gray-700 text-lg mb-7">
        Today is a new day. It's your day. You shape <br /> Sign up to start
        managing your jobs.
      </p>

      <SignupForm />

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

      <div className="mt-5 text-lg text-center">
        Already have an account?{" "}
        <Link href={routePaths.auth.login} className="font-medium text-primary">
          Login
        </Link>
      </div>
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
