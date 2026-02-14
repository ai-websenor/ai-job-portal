import axios from "axios";
import APP_CONFIG from "../config/config";
import CommonUtils from "../utils/commonUtils";
import routePaths from "../config/routePaths";
import { addToast } from "@heroui/react";

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const http = axios.create({
  baseURL: APP_CONFIG.API_BASE_URL,
  timeout: 10000,
});

http.interceptors.request.use(
  (config: any) => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  },
);

http.interceptors.response.use(
  (response: any) => response?.data,
  async (error: any) => {
    const originalRequest = error.config;

    if (
      (error.response?.status === 401 || error?.response?.statusCode === 401) &&
      !originalRequest._retry
    ) {
      const isAuthPage =
        typeof window !== "undefined" &&
        (window.location.pathname.includes(routePaths.auth.login) ||
          window.location.pathname.includes(routePaths.auth.signup));

      if (isAuthPage) {
        return Promise.reject(error?.response?.data);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return http(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const data = await CommonUtils.refreshToken();

        const newToken = data?.accessToken;
        isRefreshing = false;
        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return http(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        CommonUtils.onLogout();
        return Promise.reject(refreshError);
      }
    }

    addToast({
      title: "Oops!",
      color: "danger",
      description: error.response?.data?.message || "Something went wrong",
    });

    return Promise.reject(error?.response?.data);
  },
);

export default http;
