"use client";

import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  Switch,
} from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMainDrawer } from "../../context/MainDrawerContext";
import { headerMenus, mainDrawerData } from "../../config/data";
import routePaths from "../../config/routePaths";
import useLocalStorage from "../../hooks/useLocalStorage";
import clsx from "clsx";

import {
  HiHome,
  HiBriefcase,
  HiOfficeBuilding,
  HiChevronRight,
  HiChat,
} from "react-icons/hi";
import { MdDeleteOutline } from "react-icons/md";
import { AiOutlineLogout } from "react-icons/ai";
import CommonUtils from "@/app/utils/commonUtils";
import { useMemo } from "react";
import { FaRegFileCode } from "react-icons/fa";
import { IoIosBookmark } from "react-icons/io";

const MainDrawer = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { isMainDrawerOpen, toggleMainDrawer } = useMainDrawer();
  const { getLocalStorage } = useLocalStorage();
  const token = getLocalStorage("token");

  const getIcon = (title: string) => {
    switch (title) {
      case "Home":
      case "Dashboard":
        return <HiHome size={20} />;
      case "Jobs":
        return <HiBriefcase size={20} />;
      case "Companies":
        return <HiOfficeBuilding size={20} />;
      case "Messages":
        return <HiChat size={20} />;
      case "Applications":
        return <FaRegFileCode size={20} />;
      case "Saved Jobs":
        return <IoIosBookmark size={20} />;
      default:
        return null;
    }
  };

  const updatedMenus = useMemo(() => {
    return headerMenus.candidate.map((menu) => {
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

  const handleLinkClick = (href: string) => {
    router.push(href);
    toggleMainDrawer();
  };

  return (
    <Drawer
      isOpen={isMainDrawerOpen}
      onOpenChange={toggleMainDrawer}
      placement="right"
      size="xs"
    >
      <DrawerContent>
        {() => (
          <>
            <DrawerHeader className="flex flex-col gap-1 pt-8 border-b">
              <div className="flex items-center gap-2 px-2">
                <Image
                  src="/assets/images/logo.svg"
                  alt="logo"
                  width={35}
                  height={35}
                />
                <span className="text-xl font-bold bg-primary bg-clip-text text-transparent">
                  JobBoard
                </span>
              </div>
            </DrawerHeader>
            <DrawerBody className="pt-6">
              <div className="flex flex-col gap-2">
                <div className="sm:hidden flex flex-col gap-2">
                  {updatedMenus?.map((menu) => {
                    const isActive = pathname === menu?.href;
                    return (
                      menu && (
                        <Link
                          key={menu?.title}
                          href={menu?.href}
                          onClick={toggleMainDrawer}
                          className={clsx(
                            "px-4 py-2 rounded-xl text-base font-medium transition-all flex items-center gap-3",
                            {
                              "bg-primary text-white": isActive,
                              "text-gray-600 hover:bg-gray-50": !isActive,
                            },
                          )}
                        >
                          {getIcon(menu?.title)}
                          {menu?.title}
                        </Link>
                      )
                    );
                  })}

                  <div className="border-t my-4" />
                </div>

                {token && (
                  <>
                    {mainDrawerData.map((section) => (
                      <div
                        key={section.title}
                        className={clsx("flex flex-col gap-1")}
                      >
                        <h3 className="px-4 text-lg font-bold text-gray-900 mb-2">
                          {section.title}
                        </h3>

                        {section.child.map((item) => (
                          <div
                            key={item.title}
                            onClick={() =>
                              (item as any)?.href
                                ? handleLinkClick((item as any)?.href)
                                : null
                            }
                            className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <item.icon size={22} className="text-gray-700" />
                              <span className="text-base font-medium text-gray-700">
                                {item.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {(item as any)?.type === "switch" ? (
                                <Switch
                                  size="sm"
                                  defaultSelected={
                                    (item as any)?.defaultChecked
                                  }
                                />
                              ) : (
                                <HiChevronRight
                                  className="text-gray-400"
                                  size={20}
                                />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}

                    <div className={clsx("flex flex-col gap-1")}>
                      <h3 className="px-4 text-lg font-bold text-gray-900 mb-2">
                        Account
                      </h3>

                      <div className="flex items-center justify-between px-4 py-2 hover:bg-red-50 rounded-xl cursor-pointer transition-colors">
                        <div className="flex items-center gap-3">
                          <MdDeleteOutline size={22} className="text-red-500" />
                          <span className="text-base font-medium text-red-500">
                            Delete Account
                          </span>
                        </div>
                        <HiChevronRight className="text-red-500" size={20} />
                      </div>

                      <div
                        onClick={() => {
                          CommonUtils.onLogout();
                          toggleMainDrawer();
                        }}
                        className="flex items-center justify-between px-4 py-2 hover:bg-red-50 rounded-xl cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <AiOutlineLogout size={22} className="text-red-500" />
                          <span className="text-base font-medium text-red-500">
                            Logout
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {!token && (
                  <div className="flex flex-col gap-3">
                    <Button
                      color="primary"
                      variant="bordered"
                      onPress={() => handleLinkClick(routePaths.auth.login)}
                    >
                      Login
                    </Button>
                    <Button
                      color="primary"
                      onPress={() => handleLinkClick(routePaths.auth.signup)}
                    >
                      Signup as Candidate
                    </Button>
                    <Button
                      color="primary"
                      onPress={() =>
                        router.push(routePaths.employee.auth.signup)
                      }
                    >
                      Signup as Employer
                    </Button>
                  </div>
                )}
              </div>
            </DrawerBody>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default MainDrawer;
