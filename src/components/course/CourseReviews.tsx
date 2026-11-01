import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface CourseReviewsProps {
  courseId: string;
  isEnrolled: boolean;
}

export const CourseReviews: React.FC<CourseReviewsProps> = ({ courseId, isEnrolled }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);
  const [showForm, setShowForm] = useState(false);

  const { data: reviews = [] } = useQuery({
    queryKey: ['course-reviews', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_reviews')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch profiles for reviewers
      const userIds = data.map((r: any) => r.user_id);
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return data.map((r: any) => ({ ...r, profile: profileMap.get(r.user_id) }));
    },
    enabled: !!courseId,
  });

  const existingReview = reviews.find((r: any) => r.user_id === user?.id);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '0';

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('course_reviews').upsert({
        course_id: courseId,
        user_id: user?.id,
        rating,
        review: review.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-reviews', courseId] });
      toast.success('Review submitted!');
      setShowForm(false);
      setReview('');
    },
    onError: () => toast.error('Failed to submit review'),
  });

  const renderStars = (value: number, interactive = false, size = 'h-4 w-4') => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${size} ${interactive ? 'cursor-pointer' : ''} ${
            star <= (interactive ? (hoveredStar || rating) : value)
              ? 'fill-warning text-warning'
              : 'text-muted-foreground/30'
          }`}
          onClick={interactive ? () => setRating(star) : undefined}
          onMouseEnter={interactive ? () => setHoveredStar(star) : undefined}
          onMouseLeave={interactive ? () => setHoveredStar(0) : undefined}
        />
      ))}
    </div>
  );

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-warning/5 to-warning/10 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-warning" />
            </div>
            Student Reviews
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{avgRating}</span>
            {renderStars(parseFloat(avgRating as string))}
            <span className="text-sm text-muted-foreground">({reviews.length})</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5 space-y-5">
        {/* Submit Review */}
        {isEnrolled && user && !existingReview && (
          <div>
            {showForm ? (
              <div className="p-4 bg-muted/30 rounded-xl space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Your Rating:</span>
                  {renderStars(rating, true, 'h-6 w-6')}
                </div>
                <Textarea
                  placeholder="Write your review (optional)..."
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
                    Submit Review
                  </Button>
                  <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" className="w-full" onClick={() => setShowForm(true)}>
                <Star className="mr-2 h-4 w-4" /> Write a Review
              </Button>
            )}
          </div>
        )}

        {/* Reviews List */}
        {reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.slice(0, 5).map((r: any) => (
              <motion.div
                key={r.id}
                className="flex gap-4 p-4 bg-muted/20 rounded-xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={r.profile?.avatar_url} />
                  <AvatarFallback>{r.profile?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{r.profile?.full_name || 'Student'}</p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <div className="mt-1">{renderStars(r.rating)}</div>
                  {r.review && <p className="mt-2 text-sm text-muted-foreground">{r.review}</p>}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-6">No reviews yet. Be the first to review!</p>
        )}
      </CardContent>
    </Card>
  );
};
