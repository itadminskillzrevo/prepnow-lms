import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import EmailNotificationForm from '@/components/notifications/EmailNotificationForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatCard } from '@/components/analytics/StatCard';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Bell,
  Send,
  Users,
  MessageSquare,
  Info,
  AlertTriangle,
  CheckCircle,
  Megaphone,
} from 'lucide-react';

const AdminNotifications: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<string>('info');
  const [link, setLink] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Fetch all users for sending notifications
  const { data: allUsers } = useQuery({
    queryKey: ['all-users-for-notifications'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_id, full_name, email');
      return data || [];
    },
  });

  // Fetch recent announcements (notifications sent to multiple users)
  const { data: recentNotifications } = useQuery({
    queryKey: ['recent-admin-notifications'],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  // Group notifications by title and created_at to identify bulk sends
  const announcementGroups = React.useMemo(() => {
    const groups: Record<string, any[]> = {};
    recentNotifications?.forEach((n: any) => {
      const key = `${n.title}-${n.message}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });
    return Object.entries(groups)
      .filter(([_, items]) => items.length > 1)
      .map(([_, items]) => ({
        ...items[0],
        recipientCount: items.length,
      }))
      .slice(0, 10);
  }, [recentNotifications]);

  const sendAnnouncementMutation = useMutation({
    mutationFn: async () => {
      if (!allUsers || allUsers.length === 0) {
        throw new Error('No users found');
      }

      // Create notifications for all users
      const notifications = allUsers.map((u: any) => ({
        user_id: u.user_id,
        title,
        message,
        type,
        link: link || null,
        is_read: false,
      }));

      const { error } = await supabase.from('notifications').insert(notifications);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Announcement sent to ${allUsers?.length} users!`);
      setTitle('');
      setMessage('');
      setType('info');
      setLink('');
      queryClient.invalidateQueries({ queryKey: ['recent-admin-notifications'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send announcement');
    },
  });

  const handleSendAnnouncement = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }
    setIsSending(true);
    try {
      await sendAnnouncementMutation.mutateAsync();
    } finally {
      setIsSending(false);
    }
  };

  const getTypeIcon = (notifType: string) => {
    switch (notifType) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  const getTypeBadgeVariant = (notifType: string) => {
    switch (notifType) {
      case 'success':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Notification Management</h1>
          <p className="text-muted-foreground mt-1">
            Send announcements and important updates to all users
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard title="Total Users" value={allUsers?.length || 0} icon={Users} />
          <StatCard title="Announcements Sent" value={announcementGroups.length} icon={Megaphone} />
          <StatCard title="Total Notifications" value={recentNotifications?.length || 0} icon={Bell} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Send Announcement Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send Announcement
              </CardTitle>
              <CardDescription>
                Send a notification to all {allUsers?.length || 0} users on the platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Announcement title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  placeholder="Write your announcement message..."
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">
                        <div className="flex items-center gap-2">
                          <Info className="h-4 w-4 text-primary" />
                          Information
                        </div>
                      </SelectItem>
                      <SelectItem value="success">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-success" />
                          Success
                        </div>
                      </SelectItem>
                      <SelectItem value="warning">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-warning" />
                          Warning
                        </div>
                      </SelectItem>
                      <SelectItem value="error">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          Alert
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="link">Link (optional)</Label>
                  <Input
                    id="link"
                    placeholder="/courses or https://..."
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                  />
                </div>
              </div>
              <Button
                className="w-full"
                onClick={handleSendAnnouncement}
                disabled={isSending || !title.trim() || !message.trim()}
              >
                {isSending ? (
                  'Sending...'
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send to All Users ({allUsers?.length || 0})
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Recent Announcements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Recent Announcements
              </CardTitle>
              <CardDescription>
                Announcements sent to multiple users
              </CardDescription>
            </CardHeader>
            <CardContent>
              {announcementGroups.length > 0 ? (
                <div className="space-y-4">
                  {announcementGroups.map((announcement: any, index: number) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-muted">
                            {getTypeIcon(announcement.type)}
                          </div>
                          <div className="space-y-1">
                            <p className="font-medium">{announcement.title}</p>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {announcement.message}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{format(new Date(announcement.created_at), 'MMM d, yyyy h:mm a')}</span>
                              <span>•</span>
                              <span>{announcement.recipientCount} recipients</span>
                            </div>
                          </div>
                        </div>
                        <Badge variant={getTypeBadgeVariant(announcement.type) as any} className="capitalize shrink-0">
                          {announcement.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Megaphone className="mx-auto h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    No announcements sent yet
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Email Notification Section */}
        <EmailNotificationForm allUsers={allUsers || []} />
      </div>
    </DashboardLayout>
  );
};

export default AdminNotifications;