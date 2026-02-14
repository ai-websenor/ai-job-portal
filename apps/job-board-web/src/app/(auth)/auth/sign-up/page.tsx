"use client";

import Image from "next/image";
import SignupForm from "./SignupForm";
import { Button, addToast } from "@heroui/react";
import Link from "next/link";
import routePaths from "@/app/config/routePaths";
import withoutAuth from "@/app/hoc/withoutAuth";
import BackButton from "@/app/components/lib/BackButton";
import { useState } from "react";
import http from "@/app/api/http";
import ENDPOINTS from "@/app/api/endpoints";

const page = () => {
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignup = async () => {
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
        description: "Failed to initiate Google sign up",
      });
      setGoogleLoading(false);
    }
  };

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
        <Button
          className="bg-[#F0F7F9] text-[#11181C] font-medium h-14"
          radius="lg"
          variant="flat"
          isLoading={googleLoading}
          onPress={handleGoogleSignup}
          startContent={
            !googleLoading && (
              <Image
                src="/assets/images/google-icon.png"
                width={20}
                height={20}
                alt="Sign up with Google"
              />
            )
          }
        >
          Sign up with Google
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
              alt="Sign up with Apple"
            />
          }
        >
          Sign up with Apple
        </Button>
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
