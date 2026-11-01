import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { UserCircle, BookOpen, Users } from 'lucide-react';

interface InstructorSectionProps {
  instructorId: string;
}

export const InstructorSection: React.FC<InstructorSectionProps> = ({ instructorId }) => {
  const { data: instructor } = useQuery({
    queryKey: ['instructor-profile', instructorId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', instructorId)
        .single();
      return data;
    },
    enabled: !!instructorId,
  });

  const { data: stats } = useQuery({
    queryKey: ['instructor-stats', instructorId],
    queryFn: async () => {
      const { count: courseCount } = await supabase
        .from('courses')
        .select('id', { count: 'exact', head: true })
        .eq('instructor_id', instructorId)
        .eq('is_published', true);

      return { courses: courseCount || 0 };
    },
    enabled: !!instructorId,
  });

  if (!instructor) return null;

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-secondary/5 to-secondary/10 pb-4">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
            <UserCircle className="h-5 w-5 text-secondary-foreground" />
          </div>
          About the Instructor
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 ring-2 ring-primary/20">
            <AvatarImage src={instructor.avatar_url || ''} />
            <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
              {instructor.full_name?.charAt(0) || 'I'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-lg font-bold">{instructor.full_name || 'Instructor'}</h3>
            <div className="flex items-center gap-3 mt-1">
              <Badge variant="secondary" className="text-xs">
                <BookOpen className="h-3 w-3 mr-1" />
                {stats?.courses || 0} Courses
              </Badge>
            </div>
            {instructor.bio && (
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{instructor.bio}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
