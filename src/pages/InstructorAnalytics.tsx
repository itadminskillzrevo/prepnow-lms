import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AnalyticsChart } from '@/components/analytics/AnalyticsChart';
import { StatCard } from '@/components/analytics/StatCard';
import { useInstructorAnalytics } from '@/hooks/useAnalytics';
import { Users, BookOpen, TrendingUp, Award } from 'lucide-react';

const InstructorAnalytics: React.FC = () => {
  const { data, isLoading } = useInstructorAnalytics();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {[1,2,3,4].map(i => <div key={i} className="h-32 bg-muted rounded-xl" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Your Analytics</h1>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Views" value={data?.totals?.totalViews || 0} icon={TrendingUp} />
          <StatCard title="Enrollments" value={data?.totals?.totalEnrollments || 0} icon={Users} />
          <StatCard title="Completions" value={data?.totals?.totalCompletions || 0} icon={Award} />
          <StatCard title="Courses" value={data?.courses?.length || 0} icon={BookOpen} />
        </div>

        <AnalyticsChart
          data={data?.analytics || []}
          title="Course Performance"
          dataKey="views"
          type="area"
        />
      </div>
    </DashboardLayout>
  );
};

export default InstructorAnalytics;
