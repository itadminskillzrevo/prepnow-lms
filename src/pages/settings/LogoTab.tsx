import React from 'react';
import { LogoUpload } from '@/components/settings/LogoUpload';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette } from 'lucide-react';

const LogoTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Branding
          </CardTitle>
          <CardDescription>Upload and manage your platform logo</CardDescription>
        </CardHeader>
        <CardContent>
          <LogoUpload />
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-muted-foreground">More Settings Coming Soon</CardTitle>
          <CardDescription>
            Additional platform settings like email templates, notifications, and integrations will be available here.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};

export default LogoTab;
