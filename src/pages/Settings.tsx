import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Palette, Tags, UserCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const LogoTab = React.lazy(() => import('./settings/LogoTab'));
const CategoriesTab = React.lazy(() => import('./settings/CategoriesTab'));
const ProfileTab = React.lazy(() => import('./settings/ProfileTab'));

const SettingsPage: React.FC = () => {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState('categories');

  if (role !== 'admin' && role !== 'superadmin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your platform settings and branding
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="categories" className="gap-2">
              <Tags className="h-4 w-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <UserCircle className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="logo" className="gap-2">
              <Palette className="h-4 w-4" />
              Logo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categories">
            <React.Suspense fallback={<div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
              <CategoriesTab />
            </React.Suspense>
          </TabsContent>

          <TabsContent value="profile">
            <React.Suspense fallback={<div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
              <ProfileTab />
            </React.Suspense>
          </TabsContent>

          <TabsContent value="logo">
            <React.Suspense fallback={<div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
              <LogoTab />
            </React.Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
