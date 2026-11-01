import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Search,
  Clock,
  Star,
  BookOpen,
  PlayCircle,
  CheckCircle,
  Edit,
  Eye,
  ChevronDown,
  ChevronUp,
  Compass,
} from 'lucide-react';

const MyCourses: React.FC = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [myLearningSearch, setMyLearningSearch] = useState('');
  const [myLearningStatus, setMyLearningStatus] = useState('all');
  const [browseSearch, setBrowseSearch] = useState('');
  const [browseCategory, setBrowseCategory] = useState('all');
  const [browseDifficulty, setBrowseDifficulty] = useState('all');
  const [isBrowseOpen, setIsBrowseOpen] = useState(false);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('order_index');
      if (error) throw error;
      return data;
    },
  });

  // Fetch user's enrolled courses
  const { data: enrollments, isLoading: isLoadingEnrollments } = useQuery({
    queryKey: ['my-enrollments', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('enrollments')
        .select(`
          *,
          course:courses(*)
        `)
        .eq('user_id', user?.id)
        .order('enrolled_at', { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch lesson progress for real course completion
  const { data: lessonProgress } = useQuery({
    queryKey: ['my-courses-lesson-progress', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('lesson_progress')
        .select('lesson_id, is_completed')
        .eq('user_id', user!.id);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const enrolledCourseIds = enrollments?.map((e: any) => e.course_id) || [];
  const { data: courseLessonsMap } = useQuery({
    queryKey: ['my-courses-lessons-map', enrolledCourseIds],
    queryFn: async () => {
      if (enrolledCourseIds.length === 0) return {};
      const { data: modules } = await supabase
        .from('modules')
        .select('id, course_id')
        .in('course_id', enrolledCourseIds);
      if (!modules || modules.length === 0) return {};
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id, module_id')
        .in('module_id', modules.map(m => m.id));
      const modToCourse = Object.fromEntries(modules.map(m => [m.id, m.course_id]));
      const result: Record<string, string[]> = {};
      (lessons || []).forEach(l => {
        const cId = modToCourse[l.module_id];
        if (cId) {
          if (!result[cId]) result[cId] = [];
          result[cId].push(l.id);
        }
      });
      return result;
    },
    enabled: enrolledCourseIds.length > 0,
  });

  const getCourseProgress = (courseId: string): number => {
    const lessonIds = courseLessonsMap?.[courseId];
    if (!lessonIds || lessonIds.length === 0) return 0;
    const completed = lessonIds.filter(lid =>
      lessonProgress?.some(lp => lp.lesson_id === lid && lp.is_completed)
    ).length;
    return Math.round((completed / lessonIds.length) * 100);
  };

  // Fetch courses - admins/superadmins see ALL, instructors see only their own
  const { data: instructorCourses } = useQuery({
    queryKey: ['instructor-courses', user?.id, role],
    queryFn: async () => {
      let query = supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Instructors only see their own courses; admins/superadmins see all
      if (role === 'instructor') {
        query = query.eq('instructor_id', user?.id);
      }
      
      const { data } = await query;
      return data || [];
    },
    enabled: !!user?.id && (role === 'instructor' || role === 'admin' || role === 'superadmin'),
  });

  // Fetch all published courses for Browse section
  const { data: allCourses, isLoading: isLoadingCourses } = useQuery({
    queryKey: ['all-courses', browseSearch, browseCategory, browseDifficulty],
    queryFn: async () => {
      let query = supabase
        .from('courses')
        .select('*')
        .eq('is_published', true);

      if (browseSearch) {
        query = query.ilike('title', `%${browseSearch}%`);
      }
      if (browseCategory !== 'all') {
        query = query.eq('category', browseCategory);
      }
      if (browseDifficulty !== 'all') {
        query = query.eq('difficulty_level', browseDifficulty);
      }

      const { data } = await query.order('created_at', { ascending: false });
      return data || [];
    },
    enabled: isBrowseOpen,
  });

  // Filter My Learning courses
  const filteredEnrollments = useMemo(() => {
    if (!enrollments) return [];
    
    return enrollments.filter((enrollment: any) => {
      const matchesSearch = !myLearningSearch || 
        enrollment.course?.title?.toLowerCase().includes(myLearningSearch.toLowerCase());
      
      const matchesStatus = myLearningStatus === 'all' ||
        (myLearningStatus === 'completed' && enrollment.completed_at) ||
        (myLearningStatus === 'in-progress' && !enrollment.completed_at);
      
      return matchesSearch && matchesStatus;
    });
  }, [enrollments, myLearningSearch, myLearningStatus]);

  const [createdSearch, setCreatedSearch] = useState('');
  const [createdStatus, setCreatedStatus] = useState('all');
  const [createdCategory, setCreatedCategory] = useState('all');

  const difficulties = ['beginner', 'intermediate', 'advanced'];
  const isInstructor = role === 'instructor' || role === 'admin' || role === 'superadmin';

  // Filter instructor's created courses
  const filteredInstructorCourses = useMemo(() => {
    if (!instructorCourses) return [];
    return instructorCourses.filter((course: any) => {
      const matchesSearch = !createdSearch || 
        course.title?.toLowerCase().includes(createdSearch.toLowerCase());
      const matchesStatus = createdStatus === 'all' ||
        (createdStatus === 'published' && course.is_published) ||
        (createdStatus === 'draft' && !course.is_published);
      const matchesCategory = createdCategory === 'all' ||
        course.category === createdCategory;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [instructorCourses, createdSearch, createdStatus, createdCategory]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">My Courses</h1>
            <p className="text-muted-foreground mt-1">Track your learning journey</p>
          </div>
          {isInstructor && (
            <Button onClick={() => navigate('/courses/create')}>Create Course</Button>
          )}
        </div>

        {/* Search & Filter - right below header */}
        {isInstructor && (
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search created courses..."
                className="pl-9"
                value={createdSearch}
                onChange={(e) => setCreatedSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Select value={createdStatus} onValueChange={setCreatedStatus}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
              <Select value={createdCategory} onValueChange={setCreatedCategory}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Instructor's Created Courses Section */}
        {isInstructor && instructorCourses && instructorCourses.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Created Courses</h2>

            {filteredInstructorCourses.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredInstructorCourses.map((course: any) => (
                  <Card key={course.id} className="group hover:shadow-lg transition-shadow">
                    <CardContent className="p-0">
                      <div className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center rounded-t-lg overflow-hidden relative">
                        {course.thumbnail_url ? (
                          <img
                            src={course.thumbnail_url}
                            alt={course.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <BookOpen className="h-12 w-12 text-primary/40" />
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/courses/${course.id}`);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/courses/${course.id}/edit`);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={course.is_published ? 'default' : 'secondary'} className="text-xs">
                            {course.is_published ? 'Published' : 'Draft'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {course.course_type === 'self_paced' ? '📹 Self-Paced' : '🔴 Live'}
                          </Badge>
                        </div>
                        <h3 className="font-semibold mb-1 line-clamp-1">{course.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {course.description || 'No description'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <h3 className="mt-3 font-semibold">No courses match your filters</h3>
                  <p className="text-muted-foreground mt-1 text-sm">Try adjusting your search or filters</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* My Learning Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">My Learning</h2>
          
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search enrolled courses..."
                className="pl-9"
                value={myLearningSearch}
                onChange={(e) => setMyLearningSearch(e.target.value)}
              />
            </div>
            <Select value={myLearningStatus} onValueChange={setMyLearningStatus}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoadingEnrollments ? (
            <LoadingSkeleton />
          ) : filteredEnrollments.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEnrollments.map((enrollment: any) => (
                <Card
                  key={enrollment.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/courses/${enrollment.course_id}`)}
                >
                  <CardContent className="p-0">
                    <div className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center rounded-t-lg overflow-hidden">
                      {enrollment.course?.thumbnail_url ? (
                        <img
                          src={enrollment.course.thumbnail_url}
                          alt={enrollment.course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <BookOpen className="h-12 w-12 text-primary/40" />
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold mb-2 line-clamp-1">
                        {enrollment.course?.title}
                      </h3>
                      <div className="flex items-center gap-2 mb-3">
                        <Progress value={getCourseProgress(enrollment.course_id)} className="flex-1 h-2" />
                        <span className="text-sm font-medium">{getCourseProgress(enrollment.course_id)}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {enrollment.course?.duration_hours}h
                        </span>
                        {enrollment.completed_at ? (
                          <span className="flex items-center gap-1 text-success">
                            <CheckCircle className="h-4 w-4" /> Completed
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-primary">
                            <PlayCircle className="h-4 w-4" /> In Progress
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 font-semibold">
                  {myLearningSearch || myLearningStatus !== 'all' 
                    ? 'No courses match your filters' 
                    : 'No courses enrolled yet'}
                </h3>
                <p className="text-muted-foreground mt-1">
                  {myLearningSearch || myLearningStatus !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Browse courses below to start learning'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Browse More Section */}
        <Collapsible open={isBrowseOpen} onOpenChange={setIsBrowseOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Compass className="h-4 w-4" />
                Browse More Courses
              </span>
              {isBrowseOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-6">
            {/* Browse Search & Filters */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search all courses..."
                  className="pl-9"
                  value={browseSearch}
                  onChange={(e) => setBrowseSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <Select value={browseCategory} onValueChange={setBrowseCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={browseDifficulty} onValueChange={setBrowseDifficulty}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {difficulties.map((diff) => (
                      <SelectItem key={diff} value={diff}>
                        {diff.charAt(0).toUpperCase() + diff.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoadingCourses ? (
              <LoadingSkeleton />
            ) : allCourses && allCourses.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allCourses.map((course: any) => (
                  <CourseCard key={course.id} course={course} onClick={() => navigate(`/courses/${course.id}`)} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 font-semibold">No courses found</h3>
                  <p className="text-muted-foreground mt-1">Try adjusting your search or filters</p>
                </CardContent>
              </Card>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </DashboardLayout>
  );
};

// Helper Components
const CourseCard = ({ course, onClick }: { course: any; onClick: () => void }) => (
  <Card
    className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 group"
    onClick={onClick}
  >
    <CardContent className="p-0">
      <div className="h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <BookOpen className="h-16 w-16 text-primary/40" />
        )}
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="secondary" className="text-xs">
            {course.category || 'General'}
          </Badge>
          <Badge variant="outline" className="text-xs capitalize">
            {course.difficulty_level}
          </Badge>
        </div>
        <h3 className="font-display font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {course.title}
        </h3>
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
          {course.description || 'No description available'}
        </p>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {course.duration_hours}h
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-4 w-4 text-warning" />
            4.8
          </span>
          <span className="font-semibold text-foreground">
            {course.price > 0 ? `₹${course.price.toLocaleString('en-IN')}` : 'Free'}
          </span>
        </div>
      </div>
    </CardContent>
  </Card>
);

const LoadingSkeleton = () => (
  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[1, 2, 3].map((i) => (
      <Card key={i} className="animate-pulse">
        <CardContent className="p-0">
          <div className="h-40 bg-muted rounded-t-lg" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

export default MyCourses;
