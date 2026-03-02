'use client';

import { Button, Drawer, DrawerBody, DrawerContent, DrawerHeader, Switch } from '@heroui/react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMainDrawer } from '../../context/MainDrawerContext';
import { headerMenus, mainDrawerData } from '../../config/data';
import routePaths from '../../config/routePaths';
import useLocalStorage from '../../hooks/useLocalStorage';
import clsx from 'clsx';

import { HiHome, HiBriefcase, HiOfficeBuilding, HiChevronRight, HiChat } from 'react-icons/hi';
import { MdDeleteOutline, MdLaptopWindows } from 'react-icons/md';
import { AiOutlineLogout } from 'react-icons/ai';
import CommonUtils from '@/app/utils/commonUtils';
import { useMemo, useState } from 'react';
import { FaRegFileCode, FaUsers } from 'react-icons/fa';
import { IoIosBookmark } from 'react-icons/io';
import { Roles } from '@/app/types/enum';
import useUserStore from '@/app/store/useUserStore';
import { FaUsersViewfinder } from 'react-icons/fa6';
import ConfirmationDialog from '../dialogs/ConfirmationDialog';
import useFirebase from '@/app/hooks/useFirebase';

const MainDrawer = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUserStore();
  const { getLocalStorage } = useLocalStorage();
  const { unRegisterDeviceToken } = useFirebase();
  const { isMainDrawerOpen, toggleMainDrawer } = useMainDrawer();
  const [logoutConfirmation, setLogoutConfirmation] = useState(false);

  const token = getLocalStorage('token');

  const getIcon = (title: string) => {
    switch (title) {
      case 'Home':
      case 'Dashboard':
        return <HiHome size={20} />;
      case 'Jobs':
        return <HiBriefcase size={20} />;
      case 'Companies':
        return <HiOfficeBuilding size={20} />;
      case 'Messages':
        return <HiChat size={20} />;
      case 'Applications':
        return <FaRegFileCode size={20} />;
      case 'Saved Jobs':
        return <IoIosBookmark size={20} />;
      case 'Shortlisted':
        return <FaUsersViewfinder size={20} />;
      case 'Members':
        return <FaUsers size={20} />;
      case 'Interviews':
        return <MdLaptopWindows size={20} />;
      default:
        return null;
    }
  };

  const updatedMenus = useMemo(() => {
    const role =
      user?.role === Roles.employer || (user as any)?.role === 'super_employer'
        ? 'employer'
        : 'candidate';

    return headerMenus?.[role]?.map((menu) => {
      if (menu.isAuth && !token) {
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
  }, [token]);

  const handleLinkClick = (href: string) => {
    if (href.includes('profile')) {
      router.push(
        user?.role === Roles.candidate ? routePaths.profile : routePaths.employee.profile,
      );
    } else {
      router.push(href);
    }
    toggleMainDrawer();
  };

  const handleLogout = async () => {
    setLogoutConfirmation(false);
    await unRegisterDeviceToken();
    CommonUtils.onLogout();
  };

  return (
    <>
      <Drawer isOpen={isMainDrawerOpen} onOpenChange={toggleMainDrawer} placement="right" size="xs">
        <DrawerContent>
          {() => (
            <>
              <DrawerHeader className="flex flex-col gap-1 pt-8 border-b">
                <div className="flex items-center gap-2 px-2">
                  <Image src="/assets/images/logo.svg" alt="logo" width={35} height={35} />
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
                            href={(menu as any)?.href || '#'}
                            onClick={toggleMainDrawer}
                            className={clsx(
                              'px-4 py-2 rounded-xl text-base font-medium transition-all flex items-center gap-3',
                              {
                                'bg-primary text-white': isActive,
                                'text-gray-600 hover:bg-gray-50': !isActive,
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
                        <div key={section.title} className={clsx('flex flex-col gap-1')}>
                          <h3 className="px-4 text-lg font-bold text-gray-900 mb-2">
                            {section.title}
                          </h3>

                          {section.child.map((item) => (
                            <div
                              key={item.title}
                              onClick={() =>
                                (item as any)?.href ? handleLinkClick((item as any)?.href) : null
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
                                {(item as any)?.type === 'switch' ? (
                                  <Switch
                                    size="sm"
                                    defaultSelected={(item as any)?.defaultChecked}
                                  />
                                ) : (
                                  <HiChevronRight className="text-gray-400" size={20} />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}

                      <div className={clsx('flex flex-col gap-1')}>
                        <h3 className="px-4 text-lg font-bold text-gray-900 mb-2">Account</h3>

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
                          onClick={() => setLogoutConfirmation(true)}
                          className="flex items-center justify-between px-4 py-2 hover:bg-red-50 rounded-xl cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <AiOutlineLogout size={22} className="text-red-500" />
                            <span className="text-base font-medium text-red-500">Logout</span>
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
                        onPress={() => router.push(routePaths.employee.auth.signup)}
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

      {logoutConfirmation && (
        <ConfirmationDialog
          color="danger"
          isOpen={logoutConfirmation}
          onClose={() => setLogoutConfirmation(false)}
          title="Logout"
          message="Are you sure you want to logout?"
          onConfirm={handleLogout}
        />
      )}
    </>
  );
};

export default MainDrawer;
