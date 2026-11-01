import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { GraduationCap, ClipboardList } from 'lucide-react';
import AdminQuizzesTab from './examination/AdminQuizzesTab';
import AdminAssignmentsTab from './examination/AdminAssignmentsTab';
import StudentQuizzesTab from './examination/StudentQuizzesTab';
import StudentAssignmentsTab from './examination/StudentAssignmentsTab';

export default function Examination() {
  const { role } = useAuth();
  const isAdminLike = role === 'admin' || role === 'superadmin' || role === 'instructor';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" /> Examination
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdminLike ? 'Manage quizzes and assignments for your batches and courses.' : 'Take live quizzes and submit your assignments.'}
          </p>
        </div>

        <Tabs defaultValue="quizzes" className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="quizzes" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" /> Quizzes
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" /> Assignments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quizzes" className="mt-6">
            {isAdminLike ? <AdminQuizzesTab /> : <StudentQuizzesTab />}
          </TabsContent>
          <TabsContent value="assignments" className="mt-6">
            {isAdminLike ? <AdminAssignmentsTab /> : <StudentAssignmentsTab />}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
