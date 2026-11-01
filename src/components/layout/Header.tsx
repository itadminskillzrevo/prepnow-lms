import React, { useState, useEffect } from 'react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Clock } from 'lucide-react';
import { formatIST, getCurrentIST } from '@/lib/dateUtils';
import { Bell, Search, Menu, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface HeaderProps {
  onMenuClick: () => void;
  sidebarCollapsed: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick, sidebarCollapsed }) => {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();

  const [currentTime, setCurrentTime] = useState(getCurrentIST());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentIST());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getRoleBadgeColor = () => {
    switch (role) {
      case 'superadmin':
        return 'bg-destructive/10 text-destructive';
      case 'admin':
        return 'bg-warning/10 text-warning';
      case 'instructor':
        return 'bg-info/10 text-info';
      default:
        return 'bg-primary/10 text-primary';
    }
  };

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30 h-20 bg-card/80 backdrop-blur-md border-b border-border transition-all duration-300',
        sidebarCollapsed ? 'left-[72px]' : 'left-64'
      )}
    >
      <div className="flex h-full items-center justify-between px-6">
        {/* Left Section - Logo and Menu */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          {/* Search - Hidden on mobile */}
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search courses, lessons..."
              className="w-72 xl:w-80 pl-10 bg-secondary/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/50"
            />
          </div>
        </div>

        {/* Live IST Clock */}
        <div className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full">
          <Clock className="h-3.5 w-3.5" />
          <span className="font-medium tabular-nums">
            {formatIST(currentTime, 'hh:mm:ss a')}
          </span>
          <span className="text-xs text-muted-foreground/70">IST</span>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/notifications')}
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
              3
            </span>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center gap-3 px-2 hover:bg-secondary/80"
              >
                <Avatar className="h-9 w-9 border-2 border-primary/20">
                  <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {profile?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium leading-none mb-1">
                    {profile?.full_name || 'User'}
                  </p>
                  <span className={cn(
                    'text-[10px] font-medium px-2 py-0.5 rounded-full capitalize',
                    getRoleBadgeColor()
                  )}>
                    {role}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{profile?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => navigate('/profile')}
                className="cursor-pointer"
              >
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => navigate('/notifications')}
                className="cursor-pointer"
              >
                Notifications
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={signOut} 
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
