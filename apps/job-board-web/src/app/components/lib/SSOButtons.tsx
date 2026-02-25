"use client";

import Image from "next/image";
import { addToast, Button } from "@heroui/react";
import { Roles } from "@/app/types/enum";
import { useState } from "react";
import routePaths from "@/app/config/routePaths";
import http from "@/app/api/http";
import ENDPOINTS from "@/app/api/endpoints";

type Platform = "google" | "ios";

type Props = {
  role: Roles;
};

const SSOButtons = ({ role }: Props) => {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const redirectUri = `${window.location.origin}${routePaths.auth.googleCallback}`;

      const response = await http.get(ENDPOINTS.SSO.GOOGLE, {
        params: {
          redirectUri: redirectUri,
          role: role,
        },
      });

      if (response?.data?.url) {
        window.location.href = response?.data?.url;
      } else {
        addToast({
          title: "Oops",
          color: "danger",
          description: "URL not found in response",
        });
      }
    } catch (error) {
      console.log("Google Login Initiation Failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSSO = (platform: Platform) => {
    if (platform === "google") {
      handleGoogleLogin();
    } else if (platform === "ios") {
      console.log("Apple Sign-in triggered");
    }
  };

  return (
    <div className="mt-5 grid gap-5">
      {ssoButtons.map((item, idx) => (
        <Button
          key={idx}
          className="bg-[#F0F7F9] text-[#11181C] font-medium h-14"
          radius="lg"
          variant="flat"
          isLoading={loading}
          onPress={() => handleSSO(item.platform as Platform)}
          startContent={
            <Image src={item.icon} width={20} height={20} alt={item.label} />
          }
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
};

export default SSOButtons;

const ssoButtons = [
  {
    icon: "/assets/images/google-icon.png",
    label: "Sign in with Google",
    platform: "google",
  },
  {
    icon: "/assets/images/apple-icon.png",
    label: "Sign in with Apple",
    platform: "ios",
  },
];
