import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  ArrowLeft,
  Clock,
  BookOpen,
  PlayCircle,
  CheckCircle,
  Lock,
  FileText,
  GraduationCap,
  Loader2,
  AlertCircle,
  Users,
  Star,
  Award,
  Download,
  Video,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { BatchSelector } from '@/components/enrollment/BatchSelector';
import { CourseInfoSections } from '@/components/course/CourseInfoSections';
import { CourseReviews } from '@/components/course/CourseReviews';
import { InstructorSection } from '@/components/course/InstructorSection';

const CourseDetail: React.FC = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
      return data;
    },
    enabled: !!courseId,
  });

  const { data: modules } = useQuery({
    queryKey: ['course-modules', courseId, course?.curriculum_id],
    queryFn: async () => {
      const curriculumId = course?.curriculum_id;
      
      let modulesData;
      const selectQuery = `
        *,
        lessons:lessons(*),
        sub_modules:sub_modules(
          *,
          lessons:lessons(*)
        )
      `;
      
      if (curriculumId) {
        const { data, error } = await supabase
          .from('modules')
          .select(selectQuery)
          .eq('curriculum_id', curriculumId)
          .order('order_index');
        if (error) console.error('Modules fetch error:', error);
        modulesData = data;
      } else {
        const { data, error } = await supabase
          .from('modules')
          .select(selectQuery)
          .eq('course_id', courseId)
          .order('order_index');
        if (error) console.error('Modules fetch error:', error);
        modulesData = data;
      }
      
      return (modulesData || []).map((module: any) => ({
        ...module,
        lessons: (module.lessons || []).sort((a: any, b: any) => 
          (a.order_index ?? 0) - (b.order_index ?? 0)
        ),
        sub_modules: (module.sub_modules || [])
          .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
          .map((sm: any) => ({
            ...sm,
            lessons: (sm.lessons || []).sort((a: any, b: any) => 
              (a.order_index ?? 0) - (b.order_index ?? 0)
            ),
          })),
      }));
    },
    enabled: !!courseId && !!course,
  });

  const { data: enrollment } = useQuery({
    queryKey: ['enrollment', courseId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('enrollments')
        .select('*')
        .eq('course_id', courseId)
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!courseId && !!user,
  });

  const hasAccess = enrollment && (
    enrollment.payment_status === 'none' ||
    (enrollment.payment_status === 'completed' && enrollment.approval_status === 'approved')
  );

  const isPendingApproval = enrollment && 
    enrollment.payment_status === 'completed' && 
    enrollment.approval_status === 'pending';

  const { data: hasBatches } = useQuery({
    queryKey: ['course-has-batches', courseId],
    queryFn: async () => {
      const { count } = await supabase
        .from('batches')
        .select('id', { count: 'exact', head: true })
        .eq('course_id', courseId)
        .in('status', ['upcoming', 'active']);
      return (count || 0) > 0;
    },
    enabled: !!courseId,
  });

  // Fetch enrollment count
  const { data: enrollmentCount = 0 } = useQuery({
    queryKey: ['course-enrollment-count', courseId],
    queryFn: async () => {
      const { count } = await supabase
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('course_id', courseId)
        .eq('approval_status', 'approved');
      return count || 0;
    },
    enabled: !!courseId,
  });

  // Fetch average rating
  const { data: avgRating } = useQuery({
    queryKey: ['course-avg-rating', courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('course_reviews')
        .select('rating')
        .eq('course_id', courseId);
      if (!data || data.length === 0) return { avg: 0, count: 0 };
      const sum = data.reduce((a: number, r: any) => a + r.rating, 0);
      return { avg: parseFloat((sum / data.length).toFixed(1)), count: data.length };
    },
    enabled: !!courseId,
  });

  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('You must be logged in to enroll');
      if (!course) throw new Error('Course not found');

      const { data: existingEnrollment } = await supabase
        .from('enrollments')
        .select('id, payment_status, approval_status')
        .eq('course_id', courseId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingEnrollment) {
        if (existingEnrollment.payment_status === 'pending') {
          return { type: 'paid', enrollmentId: existingEnrollment.id, batchId: selectedBatchId };
        }
        throw new Error('You are already enrolled in this course');
      }

      if (course.price === 0 || !course.price) {
        const { error } = await supabase.from('enrollments').insert({
          course_id: courseId,
          user_id: user.id,
          payment_status: 'none',
          approval_status: 'approved',
          status: 'active',
          batch_id: selectedBatchId,
        });
        if (error) throw error;

        if (selectedBatchId) {
          const { data: existingBatchEnrollment } = await supabase
            .from('batch_enrollments')
            .select('id')
            .eq('batch_id', selectedBatchId)
            .eq('user_id', user.id)
            .maybeSingle();

          if (!existingBatchEnrollment) {
            await supabase.from('batch_enrollments').insert({
              batch_id: selectedBatchId,
              user_id: user.id,
              status: 'active',
            });
          }
        }
        return { type: 'free' };
      } else {
        const { data, error } = await supabase.from('enrollments').insert({
          course_id: courseId,
          user_id: user.id,
          payment_status: 'pending',
          approval_status: 'pending',
          status: 'pending',
          batch_id: selectedBatchId,
        }).select().single();
        if (error) throw error;
        return { type: 'paid', enrollmentId: data.id, batchId: selectedBatchId };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['enrollment', courseId] });
      if (result.type === 'free') {
        toast.success('Successfully enrolled in the course!');
      } else {
        navigate(`/courses/${courseId}/payment`, { 
          state: { enrollmentId: result.enrollmentId, batchId: result.batchId } 
        });
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to enroll');
    },
  });

  const handleEnroll = () => {
    if (!user) {
      navigate('/auth', { state: { from: { pathname: `/courses/${courseId}` } } });
      return;
    }
    enrollMutation.mutate();
  };

  const totalLessons = modules?.reduce((acc: number, m: any) => {
    const directLessons = m.lessons?.length || 0;
    const subModuleLessons = (m.sub_modules || []).reduce((s: number, sm: any) => s + (sm.lessons?.length || 0), 0);
    return acc + directLessons + subModuleLessons;
  }, 0) || 0;

  const isSelfPaced = course?.course_type === 'self_paced';
  const isFree = !course?.price || course?.price === 0;
  const requirements = (course as any)?.requirements || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Course not found</h1>
          <Button onClick={() => navigate('/courses')}>Back to Courses</Button>
        </div>
      </div>
    );
  }

  const renderLessonItem = (lesson: any) => (
    <div
      key={lesson.id}
      className={`flex items-center justify-between p-3 rounded-lg transition-all ${
        hasAccess || lesson.is_free
          ? 'hover:bg-primary/5 cursor-pointer' 
          : 'opacity-60'
      }`}
      onClick={() => {
        if (hasAccess) {
          navigate(`/courses/${courseId}/lessons/${lesson.id}`);
        } else if (lesson.is_free) {
          if (!user) {
            navigate('/auth', { state: { from: { pathname: `/courses/${courseId}/lessons/${lesson.id}` } } });
          } else {
            navigate(`/courses/${courseId}/lessons/${lesson.id}`);
          }
        }
      }}
    >
      <div className="flex items-center gap-3">
        {hasAccess ? (
          <PlayCircle className="h-5 w-5 text-primary" />
        ) : lesson.is_free ? (
          <PlayCircle className="h-5 w-5 text-green-500" />
        ) : (
          <Lock className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">{lesson.title}</span>
        {lesson.is_free && !hasAccess && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500 text-green-600">Free Preview</Badge>
        )}
      </div>
      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
        {lesson.duration_minutes || 0} min
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/courses')} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="font-semibold truncate max-w-[200px] sm:max-w-md">{course.title}</span>
          </div>
          {user && (
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
              Dashboard
            </Button>
          )}
        </div>
      </header>

      {/* Hero Banner - for all course types */}
      <div className="bg-gradient-to-r from-primary/90 to-primary/70 text-primary-foreground">
        <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="grid lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-primary-foreground/20 text-primary-foreground border-0">
                  {isSelfPaced ? (
                    <><Video className="h-3 w-3 mr-1" /> Self-Paced</>
                  ) : (
                    <><PlayCircle className="h-3 w-3 mr-1" /> Live Course</>
                  )}
                </Badge>
                <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 capitalize">
                  {course.difficulty_level || 'All Levels'}
                </Badge>
                <Badge className="bg-primary-foreground/20 text-primary-foreground border-0">
                  {course.category || 'General'}
                </Badge>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                {course.title}
              </h1>
              <p className="text-primary-foreground/80 text-base sm:text-lg max-w-2xl">
                {course.description}
              </p>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-primary-foreground/90">
                {avgRating && avgRating.count > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-lg">{avgRating.avg}</span>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`h-4 w-4 ${s <= Math.round(avgRating.avg) ? 'fill-warning text-warning' : 'text-primary-foreground/30'}`} />
                      ))}
                    </div>
                    <span>({avgRating.count} reviews)</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {enrollmentCount.toLocaleString('en-IN')} Students
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {course.duration_hours || 0} hours
                </div>
                <div className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" />
                  {totalLessons} lessons
                </div>
              </div>
            </div>
            {/* Thumbnail */}
            <div className="hidden lg:block">
              <div className="rounded-2xl overflow-hidden shadow-2xl aspect-video bg-black/20">
                {course.thumbnail_url ? (
                  <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <BookOpen className="h-16 w-16 text-primary-foreground/30" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-10">
          {/* Main Content */}
          <motion.div 
            className="lg:col-span-2 space-y-6 sm:space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* What You Will Learn */}
            {course.key_highlights && course.key_highlights.length > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    What You Will Learn
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid sm:grid-cols-2 gap-3">
                    {course.key_highlights.map((item: string, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-2">
                        <CheckCircle className="h-4 w-4 text-success mt-0.5 shrink-0" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Course Content */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Course Content
                  </CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {modules?.length || 0} modules • {totalLessons} lessons
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {modules && modules.length > 0 ? (
                  <Accordion type="multiple" className="space-y-3">
                    {modules.map((module: any, index: number) => (
                      <AccordionItem
                        key={module.id}
                        value={module.id}
                        className="border rounded-xl px-4 bg-card shadow-sm hover:shadow-md transition-shadow"
                      >
                        <AccordionTrigger className="hover:no-underline py-4">
                          <div className="flex items-center gap-4 text-left">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-md">
                              {index + 1}
                            </span>
                            <div>
                              <p className="font-semibold text-base">{module.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {(module.lessons?.length || 0) + (module.sub_modules || []).reduce((s: number, sm: any) => s + (sm.lessons?.length || 0), 0)} lessons
                                {module.sub_modules?.length > 0 && ` • ${module.sub_modules.length} sub-modules`}
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-1 py-2 pl-14">
                            {module.lessons?.map(renderLessonItem)}
                            {module.sub_modules?.map((subModule: any) => (
                              <div key={subModule.id} className="mt-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1.5">
                                  {subModule.title}
                                </p>
                                {subModule.lessons?.map(renderLessonItem)}
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No content available yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Requirements */}
            {requirements.length > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2">
                    {requirements.map((req: string, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-foreground mt-2 shrink-0" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Additional Course Sections */}
            <CourseInfoSections course={course} />

            {/* Instructor Section */}
            {course.instructor_id && (
              <InstructorSection instructorId={course.instructor_id} />
            )}

            {/* Reviews */}
            {courseId && (
              <CourseReviews courseId={courseId} isEnrolled={!!hasAccess} />
            )}
          </motion.div>

          {/* Sidebar */}
          <motion.div 
            className="lg:col-span-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card className="sticky top-24 border-0 shadow-xl overflow-hidden">
              {/* Price Header */}
              <div className="bg-gradient-to-br from-primary to-primary/80 p-6 text-center">
                <p className="text-4xl font-bold text-primary-foreground">
                  {!course.price || course.price === 0 ? 'Free' : `₹${course.price.toLocaleString('en-IN')}`}
                </p>
                {course.price && course.price > 0 && (
                  <p className="text-primary-foreground/80 text-sm mt-1">One-time payment</p>
                )}
              </div>

              <CardContent className="p-6 space-y-5">
                {hasAccess ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2 text-success bg-success/10 py-3 rounded-lg">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-semibold">Enrolled</span>
                    </div>
                    <Button
                      className="w-full h-12 text-base font-semibold shadow-lg"
                      onClick={() => {
                        const firstLesson = modules?.[0]?.lessons?.[0];
                        if (firstLesson) {
                          navigate(`/courses/${courseId}/lessons/${firstLesson.id}`);
                        }
                      }}
                    >
                      <PlayCircle className="mr-2 h-5 w-5" />
                      {isSelfPaced ? 'Start Learning' : 'Continue Learning'}
                    </Button>
                  </div>
                ) : isPendingApproval ? (
                  <div className="space-y-4">
                    <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 text-center">
                      <AlertCircle className="h-8 w-8 text-warning mx-auto mb-2" />
                      <p className="font-semibold text-foreground">Payment Completed</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Awaiting admin approval
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full h-11"
                      onClick={() => navigate('/my-courses')}
                    >
                      View My Courses
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Batch Selection - only for live courses */}
                    {!isSelfPaced && hasBatches && courseId && (
                      <BatchSelector
                        courseId={courseId}
                        selectedBatchId={selectedBatchId}
                        onBatchSelect={setSelectedBatchId}
                      />
                    )}

                    <Button
                      className="w-full h-12 text-base font-semibold shadow-lg"
                      onClick={handleEnroll}
                      disabled={enrollMutation.isPending || (!isSelfPaced && hasBatches && !selectedBatchId)}
                    >
                      {enrollMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Processing...
                        </>
                      ) : !course.price || course.price === 0 ? (
                        'Enroll Now - Free'
                      ) : (
                        `Enroll Now - ₹${course.price.toLocaleString('en-IN')}`
                      )}
                    </Button>
                    
                    {!isSelfPaced && hasBatches && !selectedBatchId && (
                      <p className="text-sm text-muted-foreground text-center">
                        Please select a batch to enroll
                      </p>
                    )}
                  </div>
                )}

                {/* Course Features */}
                <div className="space-y-4 pt-4 border-t">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    This course includes:
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        {isSelfPaced ? <Video className="h-4 w-4 text-primary" /> : <Clock className="h-4 w-4 text-primary" />}
                      </div>
                      <span>{course.duration_hours || 0} hours of {isSelfPaced ? 'video' : ''} content</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-primary" />
                      </div>
                      <span>{totalLessons} lessons</span>
                    </div>
                    {isSelfPaced && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-primary" />
                        </div>
                        <span>Learn at your own pace</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-sm">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Award className="h-4 w-4 text-primary" />
                      </div>
                      <span>Certificate of completion</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Download className="h-4 w-4 text-primary" />
                      </div>
                      <span>Downloadable resources</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default CourseDetail;
