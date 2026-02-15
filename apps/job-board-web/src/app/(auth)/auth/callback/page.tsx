"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner, addToast } from "@heroui/react";
import http from "@/app/api/http";
import ENDPOINTS from "@/app/api/endpoints";
import routePaths from "@/app/config/routePaths";
import useUserStore from "@/app/store/useUserStore";
import useLocalStorage from "@/app/hooks/useLocalStorage";
import { Roles } from "@/app/types/enum";

const OAuthCallbackPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useUserStore();
  const { setLocalStorage } = useLocalStorage();
  const [error, setError] = useState<string | null>(null);
  const exchangedRef = useRef(false);

  useEffect(() => {
    if (exchangedRef.current) return;

    const code = searchParams.get("code");
    const stateParam = searchParams.get("state");

    if (!code) {
      const errorParam = searchParams.get("error");
      setError(errorParam || "No authorization code received");
      return;
    }

    exchangedRef.current = true;

    let role = "candidate";
    if (stateParam) {
      try {
        const state = JSON.parse(decodeURIComponent(stateParam));
        role = state.role || "candidate";
      } catch {
        // ignore parse error, use default role
      }
    }

    const exchangeCode = async () => {
      try {
        const redirectUri = `${window.location.origin}${routePaths.auth.callback}`;
        const response = await http.post(ENDPOINTS.OAUTH.GOOGLE_CALLBACK, {
          code,
          redirectUri,
          role,
        });

        const result = response?.data;
        if (result) {
          setLocalStorage("token", result.accessToken);
          setLocalStorage("refreshToken", result.refreshToken);
          setUser(result.user);

          addToast({
            color: "success",
            title: "Success",
            description: "Logged in with Google",
          });

          // Redirect based on user state (same logic as login)
          if (!result.user?.isVerified) {
            router.replace(
              `${routePaths.auth.verifyEmail}?email=${result.user?.email}`
            );
            return;
          }

          if (
            !result.user?.isOnboardingCompleted &&
            result.user?.role === Roles.candidate
          ) {
            router.replace(
              `${routePaths.auth.onboarding}?step=${result.user?.onboardingStep || 1}`
            );
            return;
          }

          router.replace(routePaths.dashboard);
        }
      } catch (err: any) {
        console.error("OAuth callback error:", err);
        setError(err?.response?.data?.message || "Authentication failed");
      }
    };

    exchangeCode();
  }, [searchParams, router, setUser, setLocalStorage]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-danger text-lg">{error}</p>
        <button
          onClick={() => router.replace(routePaths.auth.login)}
          className="text-primary underline"
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <Spinner size="lg" />
      <p className="text-gray-600">Completing sign in...</p>
    </div>
  );
};

export default OAuthCallbackPage;
