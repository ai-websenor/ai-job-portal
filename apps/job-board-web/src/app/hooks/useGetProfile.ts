"use client";

import { useState } from "react";
import ENDPOINTS from "../api/endpoints";
import http from "../api/http";
import useUserStore from "../store/useUserStore";
import SplashScreen from "../components/lib/SplashScreen";

const useGetProfile = () => {
  const { setUser } = useUserStore();
  const [loading, setLoading] = useState(false);

  const getProfile = async () => {
    try {
      setLoading(true);
      const response = await http.get(ENDPOINTS.CANDIDATE.PROFILE);
      if (response.data) {
        setUser(response.data);
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
