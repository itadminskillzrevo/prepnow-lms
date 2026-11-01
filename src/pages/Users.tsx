import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users as UsersIcon, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const UserManagementTab = React.lazy(() => import('./users/UserManagementTab'));
const AdminManagementTab = React.lazy(() => import('./users/AdminManagementTab'));

const UsersPage: React.FC = () => {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState('user-management');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Users
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage users and administrators
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="user-management" className="gap-2">
              <UsersIcon className="h-4 w-4" />
              User Management
            </TabsTrigger>
            {role === 'superadmin' && (
              <TabsTrigger value="admin-management" className="gap-2">
                <Shield className="h-4 w-4" />
                Admin Management
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="user-management">
            <React.Suspense fallback={<div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
              <UserManagementTab />
            </React.Suspense>
          </TabsContent>

          {role === 'superadmin' && (
            <TabsContent value="admin-management">
              <React.Suspense fallback={<div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
                <AdminManagementTab />
              </React.Suspense>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default UsersPage;
