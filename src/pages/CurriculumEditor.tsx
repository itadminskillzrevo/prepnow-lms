import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Edit, Layers, Upload, Paperclip, Trash2 } from 'lucide-react';
import { CurriculumTree, CurriculumStats } from '@/components/curriculum';

interface SubModule {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  order_index: number;
  lessons?: Lesson[];
}

interface Lesson {
  id: string;
  module_id: string;
  sub_module_id: string | null;
  title: string;
  content: string | null;
  video_url: string | null;
  duration_minutes: number;
  order_index: number;
  is_free: boolean;
}

interface Module {
  id: string;
  curriculum_id: string | null;
  title: string;
  description: string | null;
  order_index: number;
  sub_modules?: SubModule[];
  lessons?: Lesson[];
}

interface Curriculum {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  created_by: string;
}

const CurriculumEditor: React.FC = () => {
  const { curriculumId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('from');

  // Dialog states
  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
  const [isSubModuleDialogOpen, setIsSubModuleDialogOpen] = useState(false);
  const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false);
  const [deleteDialogState, setDeleteDialogState] = useState<{
    type: 'module' | 'submodule' | 'lesson';
    id: string;
    title: string;
  } | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedSubModuleId, setSelectedSubModuleId] = useState<string | null>(null);

  // Form states
  const [moduleForm, setModuleForm] = useState({ title: '', description: '' });
  const [subModuleForm, setSubModuleForm] = useState({ title: '', description: '' });
  const [lessonForm, setLessonForm] = useState({
    title: '',
    content: '',
    video_url: '',
    duration_minutes: 0,
    is_free: false,
  });
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editingSubModule, setEditingSubModule] = useState<SubModule | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonMaterials, setLessonMaterials] = useState<any[]>([]);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);

  // Fetch curriculum details
  const { data: curriculum, isLoading: loadingCurriculum } = useQuery({
    queryKey: ['curriculum', curriculumId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculums')
        .select('*')
        .eq('id', curriculumId)
        .single();
      if (error) throw error;
      return data as Curriculum;
    },
    enabled: !!curriculumId && !!user,
  });

  // Fetch curriculum usage
  const { data: usageData } = useQuery({
    queryKey: ['curriculum-usage', curriculumId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_curriculum_usage', {
        p_curriculum_id: curriculumId,
      });
      if (error) throw error;
      return data?.[0] || { course_count: 0, batch_count: 0 };
    },
    enabled: !!curriculumId && !!user,
  });

  // Fetch modules with sub-modules and lessons
  const {
    data: modules,
    isLoading: loadingModules,
    error: modulesLoadError,
    refetch: refetchModules,
  } = useQuery({
    queryKey: ['curriculum-modules-full', curriculumId, user?.id],
    queryFn: async () => {
      if (!curriculumId) return [] as Module[];

      // Primary source: modules explicitly linked to this curriculum
      const { data: curriculumModules, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .eq('curriculum_id', curriculumId)
        .order('order_index');

      if (modulesError) throw modulesError;

      let modulesData = curriculumModules || [];

      // Backward compatibility: include legacy modules linked only by course_id
      const { data: linkedCourses, error: linkedCoursesError } = await supabase
        .from('courses')
        .select('id')
        .eq('curriculum_id', curriculumId);

      if (!linkedCoursesError) {
        const linkedCourseIds = (linkedCourses || []).map((course) => course.id);

        if (linkedCourseIds.length > 0) {
          const { data: legacyModules, error: legacyModulesError } = await supabase
            .from('modules')
            .select('*')
            .in('course_id', linkedCourseIds)
            .is('curriculum_id', null)
            .order('order_index');

          if (!legacyModulesError && legacyModules?.length) {
            const byId = new Map(modulesData.map((module) => [module.id, module]));
            legacyModules.forEach((module) => {
              if (!byId.has(module.id)) byId.set(module.id, module);
            });
            modulesData = Array.from(byId.values());
          }
        }
      }

      if (modulesData.length === 0) return [] as Module[];

      const moduleIds = modulesData.map((module) => module.id);

      const [subModulesResult, lessonsResult] = await Promise.all([
        supabase.from('sub_modules').select('*').in('module_id', moduleIds).order('order_index'),
        supabase.from('lessons').select('*').in('module_id', moduleIds).order('order_index'),
      ]);

      if (subModulesResult.error) throw subModulesResult.error;
      if (lessonsResult.error) throw lessonsResult.error;

      const subModulesData = subModulesResult.data || [];
      const lessonsData = lessonsResult.data || [];

      return modulesData.map((module) => ({
        ...module,
        sub_modules: subModulesData
          .filter((subModule) => subModule.module_id === module.id)
          .map((subModule) => ({
            ...subModule,
            lessons: lessonsData.filter((lesson) => lesson.sub_module_id === subModule.id),
          })),
        lessons: lessonsData.filter((lesson) => lesson.module_id === module.id && !lesson.sub_module_id),
      })) as Module[];
    },
    enabled: !!curriculumId && !!user,
    staleTime: 0,
    retry: 1,
  });

  const updateCurriculumMutation = useMutation({
    mutationFn: async (data: { name?: string; description?: string; status?: string }) => {
      const { error } = await supabase.from('curriculums').update(data).eq('id', curriculumId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum', curriculumId] });
      toast.success('Curriculum updated');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Module mutations
  const addModuleMutation = useMutation({
    mutationFn: async (data: { title: string; description: string }) => {
      const maxOrder = modules?.length || 0;
      const { error } = await supabase.from('modules').insert({
        curriculum_id: curriculumId,
        title: data.title,
        description: data.description || null,
        order_index: maxOrder,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      const refreshed = await refetchModules();
      if (refreshed.error) {
        toast.warning('Module add ho gaya, lekin list refresh fail hua. Ek baar page refresh karein.');
      } else {
        toast.success('Module added');
      }
      closeModuleDialog();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateModuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { title: string; description: string } }) => {
      const { error } = await supabase
        .from('modules')
        .update({ title: data.title, description: data.description || null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refetchModules();
      toast.success('Module updated');
      closeModuleDialog();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('modules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refetchModules();
      toast.success('Module deleted');
      setDeleteDialogState(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Sub-module mutations
  const addSubModuleMutation = useMutation({
    mutationFn: async ({
      moduleId,
      data,
    }: {
      moduleId: string;
      data: { title: string; description: string };
    }) => {
      const module = modules?.find((m) => m.id === moduleId);
      const maxOrder = module?.sub_modules?.length || 0;
      const { error } = await supabase.from('sub_modules').insert({
        module_id: moduleId,
        title: data.title,
        description: data.description || null,
        order_index: maxOrder,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await refetchModules();
      toast.success('Sub-module added');
      closeSubModuleDialog();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateSubModuleMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { title: string; description: string };
    }) => {
      const { error } = await supabase
        .from('sub_modules')
        .update({ title: data.title, description: data.description || null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refetchModules();
      toast.success('Sub-module updated');
      closeSubModuleDialog();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteSubModuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sub_modules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refetchModules();
      toast.success('Sub-module deleted');
      setDeleteDialogState(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Lesson mutations
  const addLessonMutation = useMutation({
    mutationFn: async ({
      moduleId,
      subModuleId,
      data,
    }: {
      moduleId: string;
      subModuleId?: string | null;
      data: typeof lessonForm;
    }) => {
      const module = modules?.find((m) => m.id === moduleId);
      let maxOrder = 0;
      if (subModuleId) {
        const subModule = module?.sub_modules?.find((sm) => sm.id === subModuleId);
        maxOrder = subModule?.lessons?.length || 0;
      } else {
        maxOrder = module?.lessons?.length || 0;
      }

      const { error } = await supabase.from('lessons').insert({
        module_id: moduleId,
        sub_module_id: subModuleId || null,
        title: data.title,
        content: data.content || null,
        video_url: data.video_url || null,
        duration_minutes: data.duration_minutes,
        is_free: data.is_free,
        order_index: maxOrder,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await refetchModules();
      toast.success('Lesson added');
      closeLessonDialog();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateLessonMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof lessonForm }) => {
      const { error } = await supabase
        .from('lessons')
        .update({
          title: data.title,
          content: data.content || null,
          video_url: data.video_url || null,
          duration_minutes: data.duration_minutes,
          is_free: data.is_free,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refetchModules();
      toast.success('Lesson updated');
      closeLessonDialog();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lessons').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refetchModules();
      toast.success('Lesson deleted');
      setDeleteDialogState(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Lesson materials helpers
  const fetchLessonMaterials = async (lessonId: string) => {
    const { data } = await supabase
      .from('course_materials')
      .select('*')
      .eq('lesson_id', lessonId);
    setLessonMaterials(data || []);
  };

  const handleMaterialUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const lessonId = editingLesson?.id;
    if (!file || !lessonId) return;

    setUploadingMaterial(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `curriculum/${lessonId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('course-media')
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('course-media')
        .getPublicUrl(fileName);

      const { error: materialError } = await supabase
        .from('course_materials')
        .insert({
          lesson_id: lessonId,
          title: file.name,
          file_url: urlData.publicUrl,
          file_type: fileExt,
          file_size: file.size,
        });
      if (materialError) throw materialError;

      toast.success('File uploaded!');
      fetchLessonMaterials(lessonId);
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploadingMaterial(false);
    }
  };

  const deleteMaterial = async (materialId: string) => {
    const { error } = await supabase
      .from('course_materials')
      .delete()
      .eq('id', materialId);
    if (error) {
      toast.error('Failed to delete');
      return;
    }
    toast.success('Material deleted');
    if (editingLesson?.id) fetchLessonMaterials(editingLesson.id);
  };

  // Dialog close handlers
  const closeModuleDialog = () => {
    setIsModuleDialogOpen(false);
    setEditingModule(null);
    setModuleForm({ title: '', description: '' });
  };

  const closeSubModuleDialog = () => {
    setIsSubModuleDialogOpen(false);
    setEditingSubModule(null);
    setSubModuleForm({ title: '', description: '' });
    setSelectedModuleId(null);
  };

  const closeLessonDialog = () => {
    setIsLessonDialogOpen(false);
    setEditingLesson(null);
    setLessonForm({ title: '', content: '', video_url: '', duration_minutes: 0, is_free: false });
    setSelectedModuleId(null);
    setSelectedSubModuleId(null);
    setLessonMaterials([]);
  };

  // Form handlers
  const handleModuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingModule) {
      updateModuleMutation.mutate({ id: editingModule.id, data: moduleForm });
    } else {
      addModuleMutation.mutate(moduleForm);
    }
  };

  const handleSubModuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSubModule) {
      updateSubModuleMutation.mutate({ id: editingSubModule.id, data: subModuleForm });
    } else if (selectedModuleId) {
      addSubModuleMutation.mutate({ moduleId: selectedModuleId, data: subModuleForm });
    }
  };

  const handleLessonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLesson) {
      updateLessonMutation.mutate({ id: editingLesson.id, data: lessonForm });
    } else if (selectedModuleId) {
      addLessonMutation.mutate({
        moduleId: selectedModuleId,
        subModuleId: selectedSubModuleId,
        data: lessonForm,
      });
    }
  };

  // Open handlers for tree actions
  const openAddModule = () => {
    setModuleForm({ title: '', description: '' });
    setEditingModule(null);
    setIsModuleDialogOpen(true);
  };

  const openEditModule = (module: Module) => {
    setEditingModule(module);
    setModuleForm({ title: module.title, description: module.description || '' });
    setIsModuleDialogOpen(true);
  };

  const openAddSubModule = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    setSubModuleForm({ title: '', description: '' });
    setEditingSubModule(null);
    setIsSubModuleDialogOpen(true);
  };

  const openEditSubModule = (subModule: SubModule) => {
    setEditingSubModule(subModule);
    setSubModuleForm({ title: subModule.title, description: subModule.description || '' });
    setIsSubModuleDialogOpen(true);
  };

  const openAddLesson = (moduleId: string, subModuleId?: string) => {
    setSelectedModuleId(moduleId);
    setSelectedSubModuleId(subModuleId || null);
    setLessonForm({ title: '', content: '', video_url: '', duration_minutes: 0, is_free: false });
    setEditingLesson(null);
    setIsLessonDialogOpen(true);
  };

  const openEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setLessonForm({
      title: lesson.title,
      content: lesson.content || '',
      video_url: lesson.video_url || '',
      duration_minutes: lesson.duration_minutes || 0,
      is_free: lesson.is_free || false,
    });
    setIsLessonDialogOpen(true);
    fetchLessonMaterials(lesson.id);
  };

  const handleBack = () => {
    if (returnTo === 'course' || returnTo === 'batch') {
      navigate(-1);
    } else {
      navigate('/admin/curriculum');
    }
  };

  // Calculate stats
  const getStats = () => {
    let totalSubModules = 0;
    let totalLessons = 0;
    let totalDuration = 0;

    modules?.forEach((m) => {
      totalSubModules += m.sub_modules?.length || 0;
      totalLessons += m.lessons?.length || 0;
      m.sub_modules?.forEach((sm) => {
        totalLessons += sm.lessons?.length || 0;
        sm.lessons?.forEach((l) => {
          totalDuration += l.duration_minutes || 0;
        });
      });
      m.lessons?.forEach((l) => {
        totalDuration += l.duration_minutes || 0;
      });
    });

    return {
      totalModules: modules?.length || 0,
      totalSubModules,
      totalLessons,
      totalDuration,
    };
  };

  const stats = getStats();

  if (loadingCurriculum) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!curriculum) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Curriculum not found</h2>
          <Button className="mt-4" onClick={() => navigate('/admin/curriculum')}>
            Back to Curriculums
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack} className="mt-1">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Layers className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold">{curriculum.name}</h1>
                <Badge variant={curriculum.status === 'active' ? 'default' : 'secondary'}>
                  {curriculum.status || 'draft'}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-2 max-w-xl">
                {curriculum.description || 'No description provided'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-12 sm:ml-0">
            <Select
              value={curriculum.status || 'draft'}
              onValueChange={(value) => updateCurriculumMutation.mutate({ status: value })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setEditingModule(null);
                setIsModuleDialogOpen(true);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <CurriculumStats
          totalModules={stats.totalModules}
          totalSubModules={stats.totalSubModules}
          totalLessons={stats.totalLessons}
          totalDurationMinutes={stats.totalDuration}
          courseCount={usageData?.course_count || 0}
          batchCount={usageData?.batch_count || 0}
        />

        {/* Curriculum Tree */}
        {modulesLoadError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Modules load nahi ho pa rahe: {(modulesLoadError as Error).message}
          </div>
        ) : (
          <CurriculumTree
            modules={modules || []}
            isLoading={loadingModules}
            onAddModule={openAddModule}
            onEditModule={openEditModule}
            onDeleteModule={(id) => {
              const mod = modules?.find((m) => m.id === id);
              setDeleteDialogState({ type: 'module', id, title: mod?.title || 'Module' });
            }}
            onAddSubModule={openAddSubModule}
            onEditSubModule={openEditSubModule}
            onDeleteSubModule={(id) => {
              let title = 'Sub-module';
              modules?.forEach((m) => {
                const sm = m.sub_modules?.find((s) => s.id === id);
                if (sm) title = sm.title;
              });
              setDeleteDialogState({ type: 'submodule', id, title });
            }}
            onAddLesson={openAddLesson}
            onEditLesson={openEditLesson}
            onDeleteLesson={(id) => {
              let title = 'Lesson';
              modules?.forEach((m) => {
                const l = m.lessons?.find((les) => les.id === id);
                if (l) title = l.title;
                m.sub_modules?.forEach((sm) => {
                  const sl = sm.lessons?.find((les) => les.id === id);
                  if (sl) title = sl.title;
                });
              });
              setDeleteDialogState({ type: 'lesson', id, title });
            }}
          />
        )}
      </div>

      {/* Module Dialog */}
      <Dialog open={isModuleDialogOpen} onOpenChange={(open) => !open && closeModuleDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingModule ? 'Edit Module' : 'Add Module'}</DialogTitle>
            <DialogDescription>
              Modules are the main sections of your curriculum.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleModuleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Module Title *</Label>
              <Input
                value={moduleForm.title}
                onChange={(e) => setModuleForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g., Introduction to Programming"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={moduleForm.description}
                onChange={(e) => setModuleForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="What will students learn in this module?"
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModuleDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!moduleForm.title || addModuleMutation.isPending || updateModuleMutation.isPending}
              >
                {(addModuleMutation.isPending || updateModuleMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingModule ? 'Update' : 'Add Module'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sub-module Dialog */}
      <Dialog open={isSubModuleDialogOpen} onOpenChange={(open) => !open && closeSubModuleDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSubModule ? 'Edit Sub-module' : 'Add Sub-module'}</DialogTitle>
            <DialogDescription>
              Sub-modules help organize lessons within a module.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubModuleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Sub-module Title *</Label>
              <Input
                value={subModuleForm.title}
                onChange={(e) => setSubModuleForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g., Variables and Data Types"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={subModuleForm.description}
                onChange={(e) => setSubModuleForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeSubModuleDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  !subModuleForm.title ||
                  addSubModuleMutation.isPending ||
                  updateSubModuleMutation.isPending
                }
              >
                {(addSubModuleMutation.isPending || updateSubModuleMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingSubModule ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lesson Dialog */}
      <Dialog open={isLessonDialogOpen} onOpenChange={(open) => !open && closeLessonDialog()}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{editingLesson ? 'Edit Lesson' : 'Add Lesson'}</DialogTitle>
            <DialogDescription>
              Lessons contain the actual content students will learn.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLessonSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Lesson Title *</Label>
              <Input
                value={lessonForm.title}
                onChange={(e) => setLessonForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g., What is a Variable?"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={lessonForm.content}
                onChange={(e) => setLessonForm((p) => ({ ...p, content: e.target.value }))}
                placeholder="Lesson content or notes..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Video URL</Label>
                <Input
                  value={lessonForm.video_url}
                  onChange={(e) => setLessonForm((p) => ({ ...p, video_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  min="0"
                  value={lessonForm.duration_minutes}
                  onChange={(e) =>
                    setLessonForm((p) => ({ ...p, duration_minutes: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="is_free"
                checked={lessonForm.is_free}
                onCheckedChange={(checked) => setLessonForm((p) => ({ ...p, is_free: checked }))}
              />
              <Label htmlFor="is_free">Free preview lesson</Label>
            </div>

            {/* Learning Materials Upload - only for existing lessons */}
            {editingLesson && (
              <div className="space-y-3 border rounded-lg p-4">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Paperclip className="h-4 w-4" />
                  Learning Materials
                </Label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    onChange={handleMaterialUpload}
                    disabled={uploadingMaterial}
                    className="hidden"
                    id="curriculum-file-upload"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.ipynb,.py,.zip,.rar,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.gif,.mp4,.mp3"
                  />
                  <label
                    htmlFor="curriculum-file-upload"
                    className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md hover:bg-accent transition-colors"
                  >
                    {uploadingMaterial ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Upload File
                  </label>
                  <span className="text-xs text-muted-foreground">
                    PDF, DOC, PPT, TXT, IPYNB, .py, ZIP, Excel, etc.
                  </span>
                </div>
                {lessonMaterials.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {lessonMaterials.map((mat) => (
                      <div
                        key={mat.id}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{mat.title}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {mat.file_type?.toUpperCase()}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => deleteMaterial(mat.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeLessonDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  !lessonForm.title || addLessonMutation.isPending || updateLessonMutation.isPending
                }
              >
                {(addLessonMutation.isPending || updateLessonMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingLesson ? 'Update' : 'Add Lesson'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteDialogState}
        onOpenChange={(open) => !open && setDeleteDialogState(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteDialogState?.type === 'submodule' ? 'Sub-module' : deleteDialogState?.type}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialogState?.title}"?
              {deleteDialogState?.type === 'module' &&
                ' This will also delete all sub-modules and lessons within it.'}
              {deleteDialogState?.type === 'submodule' &&
                ' This will also delete all lessons within it.'}
              <br />
              <strong>This action cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteDialogState) return;
                if (deleteDialogState.type === 'module') {
                  deleteModuleMutation.mutate(deleteDialogState.id);
                } else if (deleteDialogState.type === 'submodule') {
                  deleteSubModuleMutation.mutate(deleteDialogState.id);
                } else {
                  deleteLessonMutation.mutate(deleteDialogState.id);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default CurriculumEditor;
