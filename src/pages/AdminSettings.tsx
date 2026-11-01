import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LogoUpload } from '@/components/settings/LogoUpload';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Palette } from 'lucide-react';

const AdminSettings: React.FC = () => {
  const { role } = useAuth();

  // Only allow admin and superadmin
  if (role !== 'admin' && role !== 'superadmin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your platform settings and branding
          </p>
        </div>

        <div className="grid gap-6">
          {/* Branding Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Branding
            </h2>
            <LogoUpload />
          </div>

          {/* Future settings sections */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-muted-foreground">More Settings Coming Soon</CardTitle>
              <CardDescription>
                Additional platform settings like email templates, notifications, and integrations will be available here.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;