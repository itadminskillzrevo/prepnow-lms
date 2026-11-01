import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UserCircle, ArrowRight } from 'lucide-react';

const ProfileTab: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-4 rounded-full bg-primary/10 mb-4">
          <UserCircle className="h-10 w-10 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Profile Management</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          Manage your personal information, location, education, and professional experience from the dedicated profile page.
        </p>
        <Button onClick={() => navigate('/profile')} className="gap-2">
          Go to Profile <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProfileTab;
