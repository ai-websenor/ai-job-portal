"use client";

import { Button } from "@heroui/react";
import Link from "next/link";
import routePaths from "./config/routePaths";
import useLocalStorage from "./hooks/useLocalStorage";
import useUserStore from "./store/useUserStore";
import { Roles } from "./types/enum";

export default function NotFound() {
  const { user } = useUserStore();
  const { getLocalStorage } = useLocalStorage();
  const token = getLocalStorage("token");

  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="text-xl text-gray-500">
        Oops! The page you are looking for doesn't exist.
      </p>
      <Link
        href={
          token
            ? user?.role === Roles.candidate
              ? routePaths.dashboard
              : routePaths.employee.dashboard
            : routePaths.home
        }
        className="mt-5"
      >
        <Button color="primary" size="lg" variant="bordered">
          Back to {token ? "Dashboard" : "Home"}
        </Button>
      </Link>
    </div>
  );
}
