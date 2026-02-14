"use client";

import BackButton from "@/app/components/lib/BackButton";
import routePaths from "@/app/config/routePaths";
import withoutAuth from "@/app/hoc/withoutAuth";
import { Button } from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaRegBuilding } from "react-icons/fa";
import LoginForm from "./LoginForm";
import http from "@/app/api/http";
import ENDPOINTS from "@/app/api/endpoints";
import { addToast } from "@heroui/react";

const page = () => {
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      const redirectUri = `${window.location.origin}${routePaths.auth.callback}`;
      const response = await http.get(ENDPOINTS.OAUTH.GOOGLE_AUTH_URL, {
        params: { redirectUri, role: "candidate" },
      });
      if (response?.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error("Google OAuth error:", error);
      addToast({
        color: "danger",
        title: "Error",
        description: "Failed to initiate Google login",
      });
      setGoogleLoading(false);
    }
  };

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
        <Button
          className="bg-[#F0F7F9] text-[#11181C] font-medium h-14"
          radius="lg"
          variant="flat"
          isLoading={googleLoading}
          onPress={handleGoogleLogin}
          startContent={
            !googleLoading && (
              <Image
                src="/assets/images/google-icon.png"
                width={20}
                height={20}
                alt="Sign in with Google"
              />
            )
          }
        >
          Sign in with Google
        </Button>
        <Button
          className="bg-[#F0F7F9] text-[#11181C] font-medium h-14"
          radius="lg"
          variant="flat"
          isDisabled
          startContent={
            <Image
              src="/assets/images/apple-icon.png"
              width={20}
              height={20}
              alt="Sign in with Apple"
            />
          }
        >
          Sign in with Apple
        </Button>
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
