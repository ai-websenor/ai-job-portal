/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Users,
  Menu,
  X,
  Shield,
  UserPlus,
  LogOut,
  ChevronDown,
  ChevronRight,
  Building2,
  UserCircle,
  FileText,
  Video,
  Database,
  Zap,
  GraduationCap,
  Image,
  Filter,
  CreditCard,
  Package,
  Wallet,
  Mail,
  Settings,
  FileBarChart,
  Receipt,
  Newspaper,
  MessageSquare,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAuthStore, User } from '@/stores/authStore';
import routePath from '@/routes/routePath';
import config from '@/lib/config';
import { getRoleDisplayName, getCompanyScopeInfo } from '@/lib/roleHelpers';
import { canManageCompanies, canManageAdmins, canViewAnalytics } from '@/lib/permissions';

// Menu items will be filtered based on user permissions
const getAllMainItems = (user: User | null) =>
  [
    { title: 'Dashboard', url: routePath.DASHBOARD, icon: BarChart3, show: canViewAnalytics(user) },
    {
      title: 'Super Employers',
      url: routePath.USER.LIST,
      icon: Users,
      show: canManageAdmins(user),
    },
  ].filter((item) => item.show);

const getAllAdminItems = (user: User | null) =>
  [
    {
      title: 'Role Management',
      url: routePath.ROLE.LIST,
      icon: Shield,
      show: user?.role === 'super_admin',
    },
    {
      title: 'Members',
      url: routePath.MEMBER.LIST,
      icon: UserPlus,
      show: user?.role === 'admin' || user?.role === 'super_admin',
      subItems: [
        {
          title: 'Candidates',
          url: routePath.MEMBER.CANDIDATES,
          icon: UserCircle,
          show: user?.role === 'super_admin', // Only super_admin can see candidates
        },
        {
          title: 'Employers',
          url: routePath.MEMBER.EMPLOYERS,
          icon: Building2,
          show: user?.role === 'admin' || user?.role === 'super_admin', // Both can see employers
        },
      ],
    },
    {
      title: 'Company',
      url: routePath.COMPANY.PROFILE,
      icon: Building2,
      show: user?.role === 'admin' && !!user?.companyId, // Show for admins with company assigned
    },
    {
      title: 'Companies',
      url: routePath.COMPANY.LIST,
      icon: Building2,
      show: canManageCompanies(user), // Show for super_admin
    },
    {
      title: 'Resume Templates',
      url: routePath.RESUME_TEMPLATES.LIST,
      icon: FileText,
      show: user?.role === 'super_admin',
    },
    {
      title: 'Video Resume',
      url: routePath.VIDEO_RESUME.LIST,
      icon: Video,
      show: user?.role === 'super_admin',
    },
    {
      title: 'Email Templates',
      url: routePath.EMAIL_TEMPLATES.LIST,
      icon: Mail,
      show: user?.role === 'super_admin',
    },
    {
      title: 'Platform Settings',
      url: routePath.EMAIL_SETTINGS.PAGE,
      icon: Settings,
      show: user?.role === 'super_admin',
    },
    {
      title: 'Avatars',
      url: routePath.AVATARS.LIST,
      icon: Image,
      show: user?.role === 'super_admin',
    },
    {
      title: 'Master Data',
      url: routePath.MASTER_DATA.SKILLS,
      icon: Database,
      show: user?.role === 'super_admin',
      subItems: [
        {
          title: 'Skills',
          url: routePath.MASTER_DATA.SKILLS,
          icon: Zap,
          show: true,
        },
        {
          title: 'Education',
          url: routePath.MASTER_DATA.EDUCATION,
          icon: GraduationCap,
          show: true,
        },
        {
          title: 'Job Filters',
          url: routePath.MASTER_DATA.JOB_FILTERS,
          icon: Filter,
          show: true,
        },
      ],
    },
    {
      title: 'Subscriptions',
      url: routePath.SUBSCRIPTIONS.PLANS,
      icon: CreditCard,
      show: user?.role === 'super_admin',
      subItems: [
        {
          title: 'Plans',
          url: routePath.SUBSCRIPTIONS.PLANS,
          icon: Package,
          show: true,
        },
        {
          title: 'Active Subscriptions',
          url: routePath.SUBSCRIPTIONS.ACTIVE,
          icon: Users,
          show: true,
        },
        {
          title: 'Manual Activation',
          url: routePath.SUBSCRIPTIONS.MANUAL_ACTIVATE,
          icon: UserPlus,
          show: true,
        },
      ],
    },
    {
      title: 'Payments',
      url: routePath.PAYMENTS.LIST,
      icon: Wallet,
      show: user?.role === 'super_admin',
    },
    {
      title: 'Invoices',
      url: routePath.INVOICES.LIST,
      icon: Receipt,
      show: user?.role === 'super_admin',
    },
    {
      title: 'CMS Pages',
      url: routePath.CONTENT_MANAGEMENT.ABOUT_US,
      icon: Newspaper,
      show: user?.role === 'super_admin',
      subItems: [
        {
          title: 'About Us',
          url: routePath.CONTENT_MANAGEMENT.ABOUT_US,
          icon: FileText,
          show: true,
        },
        {
          title: 'Terms & Conditions',
          url: routePath.CONTENT_MANAGEMENT.TERMS_CONDITIONS,
          icon: FileText,
          show: true,
        },
        {
          title: 'Privacy Policy',
          url: routePath.CONTENT_MANAGEMENT.PRIVACY_POLICY,
          icon: FileText,
          show: true,
        },
        {
          title: 'Contact Submissions',
          url: routePath.CONTENT_MANAGEMENT.CONTACT_SUBMISSIONS,
          icon: MessageSquare,
          show: true,
        },
      ],
    },
    {
      title: 'Reports',
      url: routePath.REPORTS.PAGE,
      icon: FileBarChart,
      show: user?.role === 'super_admin',
    },
  ].filter((item) => item.show);

export function AdminSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === 'collapsed';
  const { logout, user } = useAuthStore();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([
    'Members',
    'Master Data',
    'Subscriptions',
    'Content Management',
  ]);

  // Get filtered menu items based on user role and permissions
  const mainItems = getAllMainItems(user);
  const adminItems = getAllAdminItems(user);

  const isActive = (path: string) => {
    if (path === routePath.DASHBOARD) return currentPath === routePath.DASHBOARD;
    return currentPath.startsWith(path);
  };

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'bg-sidebar-accent text-sidebar-primary font-medium'
      : 'hover:bg-sidebar-accent/50 text-sidebar-foreground';

  const handleLogout = () => {
    logout();
  };

  const toggleMenu = (menuTitle: string) => {
    setExpandedMenus((prev) =>
      prev.includes(menuTitle) ? prev.filter((item) => item !== menuTitle) : [...prev, menuTitle],
    );
  };

  const isMenuExpanded = (menuTitle: string) => expandedMenus.includes(menuTitle);

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar" collapsible="icon">
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!isCollapsed ? (
          <div className="flex items-center space-x-3 flex-1">
            <img src={config.LOGO_URL} alt={config.APP_NAME} className="h-10 w-10 object-contain" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground">{config.APP_NAME}</p>
              <p className="text-xs text-sidebar-foreground/70 truncate">Admin Panel</p>
            </div>
          </div>
        ) : (
          <img src="/logo.png" alt="Logo" className="h-8 w-8 object-contain" />
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent flex-shrink-0"
        >
          {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </div>

      <SidebarContent className="p-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wider mb-2">
            Analytics
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === routePath.DASHBOARD}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${getNavCls(
                        { isActive: isActive(item.url) },
                      )}`}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && <span className="font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wider mb-2">
            Administration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.subItems ? (
                    <div>
                      <SidebarMenuButton asChild>
                        <button
                          onClick={() => toggleMenu(item.title)}
                          className={`w-full flex items-center justify-between space-x-3 px-3 py-2 rounded-lg transition-colors ${
                            isActive(item.url)
                              ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                              : 'hover:bg-sidebar-accent/50 text-sidebar-foreground'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <item.icon className="h-5 w-5 flex-shrink-0" />
                            {!isCollapsed && <span className="font-medium">{item.title}</span>}
                          </div>
                          {!isCollapsed &&
                            (isMenuExpanded(item.title) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            ))}
                        </button>
                      </SidebarMenuButton>
                      {!isCollapsed && isMenuExpanded(item.title) && (
                        <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-4">
                          {item.subItems
                            .filter((subItem: any) => subItem.show !== false)
                            .map((subItem: any) => (
                              <NavLink
                                key={subItem.title}
                                to={subItem.url}
                                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm ${getNavCls(
                                  { isActive: isActive(subItem.url) },
                                )}`}
                              >
                                <subItem.icon className="h-4 w-4 flex-shrink-0" />
                                <span>{subItem.title}</span>
                              </NavLink>
                            ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === routePath.DASHBOARD}
                        className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${getNavCls(
                          { isActive: isActive(item.url) },
                        )}`}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {!isCollapsed && <span className="font-medium">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto pt-4 border-t border-sidebar-border space-y-2">
          {!isCollapsed && (
            <div className="px-3 py-2 rounded-lg bg-sidebar-accent/50 space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-foreground text-sm font-bold">
                    {user?.name?.charAt(0) || user?.email?.charAt(0) || 'A'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {user?.email || 'Admin User'}
                  </p>
                  <p className="text-xs text-sidebar-foreground/70 truncate">
                    {user?.role ? getRoleDisplayName(user.role) : 'Administrator'}
                  </p>
                </div>
              </div>
              {user && (
                <div className="pl-11">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Building2 className="h-3 w-3 text-sidebar-foreground/60" />
                    <span className="text-sidebar-foreground/60 truncate">
                      {getCompanyScopeInfo(user)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {!isCollapsed && <span>Logout</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
