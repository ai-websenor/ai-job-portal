import axios from 'axios';
import React from 'react';
import APP_CONFIG from '../config/config';
import CommonUtils from '../utils/commonUtils';
import routePaths from '../config/routePaths';
import { addToast, getToastQueue } from '@heroui/react';
import RateLimitToastDescription from '../components/lib/RateLimitToastDescription';

let isRefreshing = false;
let failedQueue: any[] = [];
let isRateLimitToastActive = false;
let rateLimitToastTimer: number | null = null;

const RATE_LIMIT_WAIT_SECONDS = 60;

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

const showRateLimitToast = () => {
  if (isRateLimitToastActive || typeof window === 'undefined') return;

  isRateLimitToastActive = true;

  const clearRateLimitToast = () => {
    isRateLimitToastActive = false;

    if (rateLimitToastTimer) {
      window.clearTimeout(rateLimitToastTimer);
      rateLimitToastTimer = null;
    }
  };

  const toastKey = addToast({
    title: 'Too Many Requests',
    color: 'warning',
    timeout: RATE_LIMIT_WAIT_SECONDS * 1000,
    onClose: clearRateLimitToast,
    description: React.createElement(RateLimitToastDescription, {
      seconds: RATE_LIMIT_WAIT_SECONDS,
      onCountdownEnd: () => {
        clearRateLimitToast();

        if (toastKey) {
          getToastQueue().close(toastKey);
        }
      },
    }),
  } as any);

  rateLimitToastTimer = window.setTimeout(clearRateLimitToast, RATE_LIMIT_WAIT_SECONDS * 1000);
};

const http = axios.create({
  baseURL: APP_CONFIG.API_BASE_URL,
  timeout: 60000, // after 60 seconds request will be cancelled
});

http.interceptors.request.use(
  (config: any) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

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

    const isAuthPage =
      typeof window !== 'undefined' &&
      (window.location.pathname.includes(routePaths.auth.login) ||
        window.location.pathname.includes(routePaths.auth.signup) ||
        window.location.pathname.includes(routePaths.employee.auth.login) ||
        window.location.pathname.includes(routePaths.employee.auth.signup));

    if (
      (error.response?.status === 401 || error?.response?.statusCode === 401) &&
      !originalRequest._retry
    ) {
      if (isAuthPage) {
        addToast({
          title: 'Oops!',
          color: 'danger',
          description: error.response?.data?.message || 'Something went wrong',
        });
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

    if (error.response?.status === 429) {
      showRateLimitToast();
    } else {
      addToast({
        title: 'Oops!',
        color: 'danger',
        description: error.response?.data?.message || 'Something went wrong',
      });
    }

    const isBlocked = error?.response?.data?.data?.errorCode === 'USER_BLOCKED';
    if (isBlocked && !isAuthPage) {
      CommonUtils.onLogout();
    }

    return Promise.reject(error?.response?.data);
  },
);

export default http;
