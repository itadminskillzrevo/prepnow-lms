import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AnalyticsChart } from '@/components/analytics/AnalyticsChart';
import { StatCard } from '@/components/analytics/StatCard';
import { useAdminAnalytics } from '@/hooks/useAnalytics';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { Users, BookOpen, GraduationCap, Activity, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const AdminAnalytics: React.FC = () => {
  const { data: analytics, isLoading } = useAdminAnalytics();
  const { data: auditLogs } = useAuditLogs({ days: 7 });

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

  const chartData = analytics?.userAnalytics?.reduce((acc: Record<string, { date: string; users: number; time: number }>, item) => {
    const date = item.date;
    if (!acc[date]) {
      acc[date] = { date, users: 0, time: 0 };
    }
    acc[date].users += 1;
    acc[date].time += item.time_spent_minutes || 0;
    return acc;
  }, {});

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Users" value={analytics?.totalUsers || 0} icon={Users} />
          <StatCard title="Total Courses" value={analytics?.totalCourses || 0} icon={BookOpen} />
          <StatCard title="Enrollments" value={analytics?.totalEnrollments || 0} icon={GraduationCap} />
          <StatCard title="Active Users (7d)" value={analytics?.activeUsers || 0} icon={Activity} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <AnalyticsChart
            data={Object.values(chartData || {})}
            title="Daily Active Users"
            dataKey="users"
            type="area"
          />
          <AnalyticsChart
            data={Object.values(chartData || {})}
            title="Time Spent (minutes)"
            dataKey="time"
            type="bar"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" /> Recent Audit Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {auditLogs?.slice(0, 10).map((log: { id: string; action: string; entity_type: string; created_at: string }) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <Badge variant="outline">{log.action}</Badge>
                    <span className="ml-2 text-sm">{log.entity_type}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), 'PPp')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminAnalytics;
