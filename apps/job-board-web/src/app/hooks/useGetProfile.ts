"use client";

import { useState } from "react";
import ENDPOINTS from "../api/endpoints";
import http from "../api/http";
import useUserStore from "../store/useUserStore";
import { Roles } from "../types/enum";

const useGetProfile = () => {
  const { user, setUser } = useUserStore();
  const [loading, setLoading] = useState(false);

  const getProfile = async () => {
    const endpoint =
      user?.role === Roles.candidate
        ? ENDPOINTS.CANDIDATE.PROFILE
        : ENDPOINTS.EMPLOYER.PROFILE;

    try {
      setLoading(true);
      const response = await http.get(endpoint);
      if (response.data) {
        setUser({
          ...response.data,
          role: user?.role,
          isOnboardingCompleted: user?.isOnboardingCompleted,
        });
      }
    } catch (error) {
      console.log("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  return { getProfile, loading } as const;
};

export default useGetProfile;
