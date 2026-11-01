import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  GraduationCap,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  BarChart3,
  FileCheck,
  Award,
  Calendar,
  Video,
  Layers,
  Megaphone,
  ClipboardList,
  TicketPercent,
  GraduationCap as ExamIcon,
  Wallet,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { profile, role, signOut } = useAuth();
  const location = useLocation();

  // No more coming soon items - all features implemented

  const getNavItems = () => {
    // Student Menu
    if (role === 'student') {
      return [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/my-courses', icon: BookOpen, label: 'My Courses' },
        { to: '/my-batches', icon: Layers, label: 'My Batches' },
        { to: '/examination', icon: ExamIcon, label: 'Examination' },
        { to: '/calendar', icon: Calendar, label: 'Calendar' },
        { to: '/certificates', icon: Award, label: 'Certificate' },
        { to: '/profile', icon: UserCircle, label: 'Profile' },
      ];
    }

    // Instructor Menu - Only assigned content access
    if (role === 'instructor') {
      return [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/calendar', icon: Calendar, label: 'Calendar' },
      ];
    }

    // Admin Menu - Full management access (except Settings reserved for SuperAdmin)
    if (role === 'admin') {
      return [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/my-courses', icon: BookOpen, label: 'My Courses' },        
        { to: '/admin/batches', icon: GraduationCap, label: 'Batches' },
        { to: '/admin/live-classes', icon: Video, label: 'Live Classes' },
        { to: '/examination', icon: ExamIcon, label: 'Examination' },
        { to: '/admin/users', icon: Users, label: 'Users' },
        { to: '/admin/enroll-users', icon: UserCircle, label: 'Enroll Users' },
        { to: '/admin/announcements', icon: Megaphone, label: 'Announcements' },        
        { to: '/calendar', icon: Calendar, label: 'Calendar' },        
        { to: '/certificates', icon: Award, label: 'Certificate' },
        { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
        { to: '/admin/students', icon: GraduationCap, label: 'Student Progress' },
        { to: '/admin/curriculum', icon: Layers, label: 'Curriculums' },
        
      ];
    }

    // Super Admin Menu
    if (role === 'superadmin') {
      return [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/my-courses', icon: BookOpen, label: 'My Courses' },
        { to: '/admin/batches', icon: GraduationCap, label: 'Batches' },
        { to: '/admin/live-classes', icon: Video, label: 'Live Classes' },
        { to: '/examination', icon: ExamIcon, label: 'Examination' },
        { to: '/admin/users', icon: Users, label: 'Users' },
        { to: '/admin/enroll-users', icon: UserCircle, label: 'Enroll Users' },
        { to: '/admin/announcements', icon: Megaphone, label: 'Announcements' },        
        { to: '/calendar', icon: Calendar, label: 'Calendar' },
        { to: '/admin/coupons', icon: TicketPercent, label: 'Coupons' },
        { to: '/admin/finance', icon: Wallet, label: 'Finance Management' },
        { to: '/admin/approvals', icon: FileCheck, label: 'Approval' },
        { to: '/certificates', icon: Award, label: 'Certificate' },
        { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },        
        { to: '/admin/students', icon: GraduationCap, label: 'Student Progress' },
        { to: '/admin/curriculum', icon: Layers, label: 'Curriculums' },
        { to: '/admin/settings', icon: Settings, label: 'Settings' },
      ];
    }

    // Default menu
    return [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/profile', icon: UserCircle, label: 'Profile' },
    ];
  };

  const navItems = getNavItems();

  const NavItem = ({ item }: { item: typeof navItems[0] }) => {
    const isActive = location.pathname === item.to;
    
    const content = (
      <NavLink
        to={item.to}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-all duration-200 group relative',
          isActive
            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
        )}
        <item.icon className={cn(
          'h-5 w-5 shrink-0 transition-colors',
          isActive ? 'text-sidebar-primary-foreground' : 'text-sidebar-foreground group-hover:text-sidebar-foreground'
        )} />
        {!collapsed && <span>{item.label}</span>}
      </NavLink>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col',
          collapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        {/* Logo Section */}
        <div
        className={cn(
          'flex items-center border-b border-sidebar-border',
          collapsed
          ? 'h-16 justify-center px-2'
          : 'h-20 justify-center px-5'
          )}
          >
            {!collapsed && (
              <img
              src="/prepnowlogo.jpeg"
              alt="Prepnow"
              className="h-12 w-auto object-contain"
              />
            )}  
            
            {collapsed && (
              <img
              src="/prepnowlogo.jpeg"
              alt="Prepnow"
              className="h-10 w-auto object-contain"
              />
            )}
        </div>

        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn(
            'absolute -right-3 top-20 h-6 w-6 rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent shadow-md z-50',
          )}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4 scrollbar-thin">
          <nav className="space-y-1 px-3">
            {navItems.map((item) => (
              <NavItem key={item.to} item={item} />
            ))}
          </nav>
        </ScrollArea>

        {/* User Section */}
        <div className={cn(
          'border-t border-sidebar-border p-3',
          collapsed && 'flex flex-col items-center'
        )}>
          {!collapsed && profile && (
            <div className="mb-3 flex items-center gap-3 px-2">
              <div className="h-10 w-10 rounded-full bg-sidebar-accent flex items-center justify-center overflow-hidden ring-2 ring-sidebar-border">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || ''}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-semibold text-sidebar-foreground">
                    {profile.full_name?.charAt(0) || 'U'}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {profile.full_name || 'User'}
                </p>
                <p className="text-xs text-sidebar-muted capitalize">{role}</p>
              </div>
            </div>
          )}
          
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  'text-sidebar-foreground/80 hover:bg-destructive/10 hover:text-destructive transition-colors',
                  collapsed ? 'w-10 h-10 p-0' : 'w-full justify-start gap-3'
                )}
                onClick={signOut}
              >
                <LogOut className="h-5 w-5" />
                {!collapsed && <span>Sign Out</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">Sign Out</TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
};
