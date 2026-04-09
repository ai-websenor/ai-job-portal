'use client';

import { Button } from '@heroui/react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { headerMenus } from '../config/data';
import routePaths from '../config/routePaths';
import useLocalStorage from '../hooks/useLocalStorage';
import { HiMenuAlt1 } from 'react-icons/hi';
import { useMainDrawer } from '../context/MainDrawerContext';
import MainDrawer from '../components/drawers/MainDrawer';
import { useEffect, useMemo, useState } from 'react';
import { Roles } from '../types/enum';
import useUserStore from '../store/useUserStore';
import Notifications from '../components/notifications/Notifications';
import permissionUtils from '../utils/permissionUtils';

const MainHeader = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUserStore();
  const { toggleMainDrawer } = useMainDrawer();
  const [mounted, setMounted] = useState(false);
  const { getLocalStorage } = useLocalStorage();

  const token = getLocalStorage('token');

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatedMenus = useMemo(() => {
    if (!mounted) return [];

    const role =
      user?.role === Roles.employer || (user as any)?.role === 'super_employer'
        ? 'employer'
        : 'candidate';

    return headerMenus?.[role]?.map((menu) => {
      if ((menu as any)?.isGuest && token) {
        return null;
      }

      if (menu.isAuth && !token) {
        return null;
      }

      if ((menu as any)?.permission && !permissionUtils.hasPermission((menu as any)?.permission)) {
        return null;
      }

      if (menu.href === routePaths.home) {
        return {
          ...menu,
          title: token ? 'Dashboard' : 'Home',
          href: token ? routePaths.dashboard : routePaths.home,
        };
      }
      return menu;
    });
  }, [token, mounted, user]);

  return (
    <div className="h-[70px] w-full bg-white flex items-center px-5 border-b sticky top-0 z-50">
      <div className="container mx-auto grid grid-cols-2 sm:grid-cols-3 items-center">
        <div className="justify-self-start">
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
        </div>

        <div className="hidden sm:flex gap-10 justify-self-center">
          {updatedMenus
            .filter((menu) => menu !== null)
            .map((menu) => {
              const isActive = pathname === menu?.href;

              return (
                <Link
                  href={(menu as any).href || '#'}
                  key={menu.title}
                  className={clsx('text-sm font-medium transition-colors hover:text-primary', {
                    'text-primary': isActive,
                    'text-gray-600': !isActive,
                  })}
                >
                  {menu.title}
                </Link>
              );
            })}
        </div>

        <div className="justify-self-end flex items-center gap-3">
          {!token ? (
            <>
              <div className="hidden sm:flex items-center gap-3">
                <Button
                  size="sm"
                  variant="ghost"
                  color="primary"
                  onPress={() => router.push(routePaths.auth.login)}
                >
                  Login
                </Button>
                <Button
                  size="sm"
                  color="primary"
                  variant="ghost"
                  onPress={() => router.push(routePaths.auth.signup)}
                >
                  Signup as Candidate
                </Button>
                <Button
                  size="sm"
                  color="primary"
                  onPress={() => router.push(routePaths.employee.auth.signup)}
                >
                  Signup as Employer
                </Button>
              </div>
              <Button onPress={toggleMainDrawer} variant="light" size="sm" className="sm:hidden">
                <HiMenuAlt1 size={22} />
              </Button>
            </>
          ) : (
            <div className="flex gap-1 items-center">
              {token && <Notifications />}
              <Button onPress={toggleMainDrawer} variant="light" size="sm">
                <HiMenuAlt1 size={18} />
              </Button>
            </div>
          )}
        </div>
      </div>

      <MainDrawer />
    </div>
  );
};

export default MainHeader;
