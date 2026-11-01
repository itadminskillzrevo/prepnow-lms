import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileCheck, BookOpen } from 'lucide-react';

const CourseApprovalsTab = React.lazy(() => import('./approvals/CourseApprovalsTab'));
const EnrollmentApprovalsTab = React.lazy(() => import('./approvals/EnrollmentApprovalsTab'));

const ApprovalsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('course-approvals');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Approvals
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and approve courses and enrollments
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="course-approvals" className="gap-2">
              <FileCheck className="h-4 w-4" />
              Course Approvals
            </TabsTrigger>
            <TabsTrigger value="enrollment-approvals" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Enrollment Approvals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="course-approvals">
            <React.Suspense fallback={<div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
              <CourseApprovalsTab />
            </React.Suspense>
          </TabsContent>

          <TabsContent value="enrollment-approvals">
            <React.Suspense fallback={<div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
              <EnrollmentApprovalsTab />
            </React.Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ApprovalsPage;
