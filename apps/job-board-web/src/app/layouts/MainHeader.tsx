"use client";

import { Button, menuSection } from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { headerMenus } from "../config/data";
import routePaths from "../config/routePaths";
import useLocalStorage from "../hooks/useLocalStorage";
import { HiMenuAlt1 } from "react-icons/hi";
import { useMainDrawer } from "../context/MainDrawerContext";
import MainDrawer from "../components/drawers/MainDrawer";
import { useMemo } from "react";
import { Roles } from "../types/enum";
import useUserStore from "../store/useUserStore";

const MainHeader = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUserStore();
  const { getLocalStorage } = useLocalStorage();
  const { toggleMainDrawer } = useMainDrawer();

  const token = getLocalStorage("token");

  const updatedMenus = useMemo(() => {
    const role =
      user?.role === Roles.employer || (user as any)?.role === "super_employer"
        ? "employer"
        : "candidate";

    return headerMenus?.[role]?.map((menu) => {
      if (menu.isAuth && !token) {
        return null;
      }
      if (menu.href === routePaths.home) {
        return {
          ...menu,
          title: token ? "Dashboard" : "Home",
          href: token ? routePaths.dashboard : routePaths.home,
        };
      }
      return menu;
    });
  }, [token]);

  return (
    <div className="h-[70px] w-full bg-white flex items-center px-5 border-b sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between relative">
        <Image
          src="/assets/images/logo.svg"
          alt="logo"
          width={30}
          height={30}
          className="cursor-pointer"
          onClick={() =>
            router.push(
              token
                ? user?.role === Roles.candidate
                  ? routePaths.dashboard
                  : routePaths.employee.dashboard
                : routePaths.home,
            )
          }
        />

        <div className="hidden sm:flex gap-10 items-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {updatedMenus
            .filter((menu) => menu !== null)
            .map((menu) => {
              const isActive = pathname === menu?.href;

              return (
                <Link
                  href={(menu as any).href || "#"}
                  key={menu.title}
                  className={clsx(
                    "text-sm font-medium transition-colors hover:text-primary",
                    {
                      "text-primary": isActive,
                      "text-gray-600": !isActive,
                    },
                  )}
                >
                  {menu.title}
                </Link>
              );
            })}
        </div>

        {!token ? (
          <>
            <div className="hidden sm:flex items-center gap-3">
              <Button
                variant="ghost"
                color="primary"
                onPress={() => router.push(routePaths.auth.login)}
              >
                Login
              </Button>
              <Button
                color="primary"
                variant="ghost"
                onPress={() => router.push(routePaths.auth.signup)}
              >
                Signup as Candidate
              </Button>
              <Button
                color="primary"
                onPress={() => router.push(routePaths.employee.auth.signup)}
              >
                Signup as Employer
              </Button>
            </div>
            <Button
              onPress={toggleMainDrawer}
              variant="light"
              size="sm"
              className="sm:hidden"
            >
              <HiMenuAlt1 size={22} />
            </Button>
          </>
        ) : (
          <Button onPress={toggleMainDrawer} variant="light" size="sm">
            <HiMenuAlt1 size={22} />
          </Button>
        )}
      </div>

      <MainDrawer />
    </div>
  );
};

export default MainHeader;
