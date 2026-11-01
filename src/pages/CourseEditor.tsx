import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  Save,
  Eye,
  BookOpen,
  Layers,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { ThumbnailUpload } from '@/components/course-editor/ThumbnailUpload';
import { ExternalLink as ExternalLinkIcon } from 'lucide-react';

interface CourseData {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  difficulty_level: string | null;
  duration_hours: number | null;
  price: number | null;
  is_published: boolean;
  curriculum_id: string | null;
  thumbnail_url: string | null;
  program_overview: string | null;
  what_you_will_learn: string[] | null;
  key_highlights: string[] | null;
  tools_covered: string[] | null;
  skills_developed: string[] | null;
  course_type: string;
  requirements: string[] | null;
}

const CourseEditor: React.FC = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('details');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch course data
  const { data: course, isLoading } = useQuery({
    queryKey: ['course-edit', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
      if (error) throw error;
      return data as CourseData;
    },
    enabled: !!courseId,
  });

  // Fetch linked curriculum
  const { data: curriculum } = useQuery({
    queryKey: ['course-curriculum', course?.curriculum_id],
    queryFn: async () => {
      if (!course?.curriculum_id) return null;
      const { data, error } = await supabase
        .from('curriculums')
        .select('id, name, status')
        .eq('id', course.curriculum_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!course?.curriculum_id,
  });

  // Fetch modules count from linked curriculum
  const { data: modulesCount } = useQuery({
    queryKey: ['curriculum-modules-count', course?.curriculum_id],
    queryFn: async () => {
      if (!course?.curriculum_id) return 0;
      const { count, error } = await supabase
        .from('modules')
        .select('*', { count: 'exact', head: true })
        .eq('curriculum_id', course.curriculum_id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!course?.curriculum_id,
  });

  // Fetch modules with lessons for AssignmentEditor
  const { data: courseModules } = useQuery({
    queryKey: ['course-modules-with-lessons', courseId, course?.curriculum_id],
    queryFn: async () => {
      let query = supabase
        .from('modules')
        .select('*, lessons:lessons(*)')
        .order('order_index');
      
      if (course?.curriculum_id) {
        query = query.eq('curriculum_id', course.curriculum_id);
      } else {
        query = query.eq('course_id', courseId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((m: any) => ({
        ...m,
        lessons: (m.lessons || []).sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)),
      }));
    },
    enabled: !!courseId && !!course,
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories-for-course-edit'],
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

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    difficulty_level: 'beginner',
    duration_hours: 0,
    price: 0,
    is_published: false,
    course_type: 'live',
    requirements: '',
    program_overview: '',
    what_you_will_learn: '',
    key_highlights: '',
    tools_covered: '',
    skills_developed: '',
  });

  React.useEffect(() => {
    if (course) {
      setFormData({
        title: course.title || '',
        description: course.description || '',
        category: course.category || '',
        difficulty_level: course.difficulty_level || 'beginner',
        duration_hours: course.duration_hours || 0,
        price: course.price || 0,
        is_published: course.is_published || false,
        course_type: course.course_type || 'live',
        requirements: course.requirements?.join('\n') || '',
        program_overview: course.program_overview || '',
        what_you_will_learn: (course as any).what_you_will_learn?.join('\n') || '',
        key_highlights: course.key_highlights?.join('\n') || '',
        tools_covered: course.tools_covered?.join(', ') || '',
        skills_developed: course.skills_developed?.join('\n') || '',
      });
    }
  }, [course]);

  const updateCourseMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('courses')
        .update({
          title: data.title,
          description: data.description,
          category: data.category,
          difficulty_level: data.difficulty_level,
          duration_hours: data.duration_hours,
          price: data.price,
          is_published: data.is_published,
          course_type: data.course_type,
          requirements: data.requirements ? data.requirements.split('\n').filter((r: string) => r.trim()) : [],
          program_overview: data.program_overview || null,
          what_you_will_learn: data.what_you_will_learn ? data.what_you_will_learn.split('\n').filter((w: string) => w.trim()) : [],
          key_highlights: data.key_highlights ? data.key_highlights.split('\n').filter((h: string) => h.trim()) : [],
          tools_covered: data.tools_covered ? data.tools_covered.split(',').map((t: string) => t.trim()).filter((t: string) => t) : [],
          skills_developed: data.skills_developed ? data.skills_developed.split('\n').filter((s: string) => s.trim()) : [],
        })
        .eq('id', courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Course updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['course-edit', courseId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update course');
    },
  });

  // Delete course mutation using the cascade function
  const deleteCourseMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('delete_course_cascade', {
        p_course_id: courseId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Course deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      navigate('/admin/courses');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete course');
    },
  });

  const difficulties = ['beginner', 'intermediate', 'advanced'];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Course not found</h2>
          <Button className="mt-4" onClick={() => navigate('/admin/courses')}>
            Back to Courses
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold">Edit Course</h1>
              <p className="text-muted-foreground">{course.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate(`/courses/${courseId}`)}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button
              onClick={() => updateCourseMutation.mutate(formData)}
              disabled={updateCourseMutation.isPending}
            >
              {updateCourseMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6 mt-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Course Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Course Type */}
                    <div className="space-y-2">
                      <Label>Course Type</Label>
                      <Select
                        value={formData.course_type}
                        onValueChange={(value) => setFormData({ ...formData, course_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="live">🔴 Live Course</SelectItem>
                          <SelectItem value="self_paced">📹 Self-Paced Course</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {formData.course_type === 'live'
                          ? 'Includes scheduled classes, batches, and real-time instruction.'
                          : 'Students learn anytime through recorded video lessons.'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="title">Course Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        rows={5}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => setFormData({ ...formData, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat: any) => (
                              <SelectItem key={cat.id} value={cat.name}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Difficulty Level</Label>
                        <Select
                          value={formData.difficulty_level}
                          onValueChange={(value) => setFormData({ ...formData, difficulty_level: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {difficulties.map((diff) => (
                              <SelectItem key={diff} value={diff}>
                                {diff.charAt(0).toUpperCase() + diff.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Duration (hours)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.duration_hours}
                          onChange={(e) =>
                            setFormData({ ...formData, duration_hours: parseInt(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Price ($)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.price}
                          onChange={(e) =>
                            setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div>
                <ThumbnailUpload 
                  courseId={courseId!} 
                  currentThumbnail={course.thumbnail_url} 
                />
              </div>
            </div>
          </TabsContent>

          {/* Content Tab - Program Overview, Highlights, etc. */}
          <TabsContent value="content" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Course Content Sections
                </CardTitle>
                <CardDescription>
                  Add detailed information about the course that will be displayed on the course detail page
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="program_overview">Program Overview</Label>
                  <Textarea
                    id="program_overview"
                    placeholder="Describe the program overview, what students will learn..."
                    rows={4}
                    value={formData.program_overview}
                    onChange={(e) => setFormData({ ...formData, program_overview: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="what_you_will_learn">What You Will Learn</Label>
                  <Textarea
                    id="what_you_will_learn"
                    placeholder="Enter each learning outcome on a new line:&#10;Build responsive websites&#10;Master React framework&#10;Deploy applications to cloud"
                    rows={4}
                    value={formData.what_you_will_learn}
                    onChange={(e) => setFormData({ ...formData, what_you_will_learn: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Enter each learning point on a new line</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="key_highlights">Key Highlights</Label>
                  <Textarea
                    id="key_highlights"
                    placeholder="Enter each highlight on a new line:&#10;Industry-recognized certification&#10;Hands-on projects&#10;Live instructor sessions"
                    rows={4}
                    value={formData.key_highlights}
                    onChange={(e) => setFormData({ ...formData, key_highlights: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Enter each highlight on a new line</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tools_covered">Tools Covered</Label>
                  <Textarea
                    id="tools_covered"
                    placeholder="Python, TensorFlow, SQL, Tableau, Excel"
                    rows={2}
                    value={formData.tools_covered}
                    onChange={(e) => setFormData({ ...formData, tools_covered: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Separate tools with commas</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="skills_developed">Skills Developed After Completion</Label>
                  <Textarea
                    id="skills_developed"
                    placeholder="Enter each skill on a new line:&#10;Data Analysis&#10;Problem Solving&#10;Critical Thinking"
                    rows={4}
                    value={formData.skills_developed}
                    onChange={(e) => setFormData({ ...formData, skills_developed: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Enter each skill on a new line</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requirements">Course Requirements</Label>
                  <Textarea
                    id="requirements"
                    placeholder="Enter each requirement on a new line:&#10;No prior programming experience needed&#10;Laptop with internet connection"
                    rows={4}
                    value={formData.requirements}
                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Enter each requirement on a new line</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Curriculum Tab - Links to CurriculumEditor */}
          <TabsContent value="curriculum" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Linked Curriculum
                </CardTitle>
                <CardDescription>
                  This course is linked to a curriculum. Edit the curriculum to manage modules, sub-modules, and lessons.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {curriculum ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-primary/10">
                          <Layers className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{curriculum.name}</h3>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <Badge variant={curriculum.status === 'active' ? 'default' : 'secondary'}>
                              {curriculum.status || 'draft'}
                            </Badge>
                            <span>{modulesCount || 0} modules</span>
                          </div>
                        </div>
                      </div>
                      <Button onClick={() => navigate(`/admin/curriculum/${curriculum.id}/edit?from=course`)}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Edit Curriculum
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Changes made to the curriculum will be reflected in this course and any batches using the same curriculum.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Layers className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 font-semibold">No Curriculum Linked</h3>
                    <p className="text-muted-foreground mt-1">
                      This course doesn't have a linked curriculum yet.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>


          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Publishing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Publish Course</Label>
                    <p className="text-sm text-muted-foreground">
                      Make this course visible to students
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_published}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_published: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Once you delete a course, there is no going back. This will permanently delete the course and all related data including enrollments, batches, analytics, live classes, and calendar events.
                </p>
                <Button 
                  variant="destructive" 
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={deleteCourseMutation.isPending}
                >
                  {deleteCourseMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Course
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the course
              <span className="font-semibold"> "{course.title}"</span> and all its associated data including:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>All enrollments</li>
                <li>All batches and batch enrollments</li>
                <li>All live classes and schedules</li>
                <li>All calendar events</li>
                <li>All course analytics</li>
                <li>All student groups</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCourseMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCourseMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Course'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default CourseEditor;
