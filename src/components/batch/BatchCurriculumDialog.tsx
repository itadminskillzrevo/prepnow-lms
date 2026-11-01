import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Loader2,
  GripVertical,
  BookOpen,
  Eye,
  EyeOff,
  Plus,
  ChevronDown,
  ChevronRight,
  FileText,
} from 'lucide-react';

interface BatchCurriculumDialogProps {
  batch: {
    id: string;
    name: string;
    course_id: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  duration_minutes: number;
  order_index: number;
}

interface BatchCurriculumItem {
  id: string;
  batch_id: string;
  module_id: string | null;
  order_index: number;
  is_additional: boolean;
}

export const BatchCurriculumDialog: React.FC<BatchCurriculumDialogProps> = ({
  batch,
  open,
  onOpenChange,
}) => {
  const queryClient = useQueryClient();
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [hiddenModules, setHiddenModules] = useState<Set<string>>(new Set());

  // Fetch all modules from the course
  const { data: courseModules, isLoading: loadingModules } = useQuery({
    queryKey: ['course-modules', batch?.course_id],
    queryFn: async () => {
      if (!batch?.course_id) return [];
      const { data, error } = await supabase
        .from('modules')
        .select(`*, lessons(id, title, duration_minutes, order_index)`)
        .eq('course_id', batch.course_id)
        .order('order_index');
      if (error) throw error;
      return (data || []).map((m) => ({
        ...m,
        lessons: (m.lessons || []).sort(
          (a: Lesson, b: Lesson) => (a.order_index || 0) - (b.order_index || 0)
        ),
      })) as Module[];
    },
    enabled: !!batch?.course_id && open,
  });

  // Fetch batch curriculum entries (to know which modules are hidden/added)
  const { data: batchCurriculum, isLoading: loadingBatchCurriculum } = useQuery({
    queryKey: ['batch-curriculum', batch?.id],
    queryFn: async () => {
      if (!batch?.id) return [];
      const { data, error } = await supabase
        .from('batch_curriculum')
        .select('*')
        .eq('batch_id', batch.id)
        .order('order_index');
      if (error) throw error;
      return data as BatchCurriculumItem[];
    },
    enabled: !!batch?.id && open,
  });

  // Initialize hidden modules from batch_curriculum (modules NOT in batch_curriculum are visible by default)
  // Logic: if a module is in batch_curriculum with is_additional=false, it's explicitly included
  // We'll use an inverted approach: track which base modules are hidden
  useEffect(() => {
    if (!batchCurriculum || !courseModules) return;

    // Get module IDs that are in batch_curriculum
    const batchModuleIds = new Set(
      batchCurriculum.filter((bc) => bc.module_id).map((bc) => bc.module_id!)
    );

    // If there's no batch_curriculum entries at all, all modules are visible
    if (batchCurriculum.length === 0) {
      setHiddenModules(new Set());
      return;
    }

    // Modules NOT in batch_curriculum are hidden
    const hidden = new Set<string>();
    courseModules.forEach((m) => {
      if (!batchModuleIds.has(m.id)) {
        hidden.add(m.id);
      }
    });
    setHiddenModules(hidden);
  }, [batchCurriculum, courseModules]);

  // Toggle module visibility mutation
  const toggleModuleMutation = useMutation({
    mutationFn: async ({
      moduleId,
      visible,
    }: {
      moduleId: string;
      visible: boolean;
    }) => {
      if (!batch?.id) throw new Error('No batch selected');

      if (visible) {
        // Add to batch_curriculum
        const existingOrder =
          batchCurriculum?.filter((bc) => bc.module_id !== moduleId).length || 0;
        const { error } = await supabase.from('batch_curriculum').insert({
          batch_id: batch.id,
          module_id: moduleId,
          order_index: existingOrder,
          is_additional: false,
        });
        if (error) throw error;
      } else {
        // Remove from batch_curriculum
        const { error } = await supabase
          .from('batch_curriculum')
          .delete()
          .eq('batch_id', batch.id)
          .eq('module_id', moduleId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-curriculum', batch?.id] });
      toast.success('Curriculum updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Initialize curriculum mutation (copy all course modules to batch_curriculum if empty)
  const initCurriculumMutation = useMutation({
    mutationFn: async () => {
      if (!batch?.id || !courseModules) throw new Error('Missing data');

      const entries = courseModules.map((m, idx) => ({
        batch_id: batch.id,
        module_id: m.id,
        order_index: idx,
        is_additional: false,
      }));

      const { error } = await supabase.from('batch_curriculum').insert(entries);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-curriculum', batch?.id] });
      toast.success('Curriculum initialized with all course modules');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleExpand = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const handleToggleVisibility = (moduleId: string) => {
    const isCurrentlyHidden = hiddenModules.has(moduleId);
    toggleModuleMutation.mutate({ moduleId, visible: isCurrentlyHidden });

    // Optimistically update UI
    setHiddenModules((prev) => {
      const next = new Set(prev);
      if (isCurrentlyHidden) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const isLoading = loadingModules || loadingBatchCurriculum;
  const hasNoCurriculum = batchCurriculum?.length === 0;

  const visibleModulesCount =
    courseModules?.filter((m) => !hiddenModules.has(m.id)).length || 0;
  const totalLessons =
    courseModules
      ?.filter((m) => !hiddenModules.has(m.id))
      .reduce((sum, m) => sum + m.lessons.length, 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Batch Curriculum - {batch?.name}
          </DialogTitle>
          <DialogDescription>
            Customize which modules are visible for this batch. Hidden modules
            won't appear for students in this batch.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : hasNoCurriculum && courseModules && courseModules.length > 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No custom curriculum yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Initialize the batch curriculum to start customizing which
                modules are visible.
              </p>
              <Button
                onClick={() => initCurriculumMutation.mutate()}
                disabled={initCurriculumMutation.isPending}
              >
                {initCurriculumMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Initialize Curriculum
              </Button>
            </div>
          ) : courseModules && courseModules.length > 0 ? (
            <div className="space-y-4">
              {/* Summary */}
              <Card className="bg-muted/30">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {visibleModulesCount} of {courseModules.length} modules
                      visible
                    </span>
                    <span className="text-muted-foreground">
                      {totalLessons} total lessons
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Module list */}
              <div className="space-y-2">
                {courseModules.map((module, idx) => {
                  const isHidden = hiddenModules.has(module.id);
                  const isExpanded = expandedModules.has(module.id);
                  const batchEntry = batchCurriculum?.find(
                    (bc) => bc.module_id === module.id
                  );
                  const isAdditional = batchEntry?.is_additional || false;

                  return (
                    <Card
                      key={module.id}
                      className={`transition-opacity ${
                        isHidden ? 'opacity-50' : ''
                      }`}
                    >
                      <CardContent className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="text-muted-foreground cursor-grab">
                            <GripVertical className="h-4 w-4" />
                          </div>

                          <button
                            onClick={() => toggleExpand(module.id)}
                            className="p-1 hover:bg-muted rounded"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                {idx + 1}
                              </span>
                              <p
                                className={`font-medium truncate ${
                                  isHidden ? 'line-through' : ''
                                }`}
                              >
                                {module.title}
                              </p>
                              {isAdditional && (
                                <Badge variant="secondary" className="text-xs">
                                  Batch-specific
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {module.lessons.length} lessons
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {isHidden ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-primary" />
                              )}
                              <Switch
                                checked={!isHidden}
                                onCheckedChange={() =>
                                  handleToggleVisibility(module.id)
                                }
                                disabled={toggleModuleMutation.isPending}
                              />
                            </div>
                          </div>
                        </div>

                        {isExpanded && module.lessons.length > 0 && (
                          <div className="mt-3 ml-14 space-y-1">
                            {module.lessons.map((lesson, lIdx) => (
                              <div
                                key={lesson.id}
                                className="flex items-center gap-2 py-1.5 px-2 rounded bg-muted/50 text-sm"
                              >
                                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground w-8">
                                  {idx + 1}.{lIdx + 1}
                                </span>
                                <span className="flex-1 truncate">
                                  {lesson.title}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {lesson.duration_minutes || 0} min
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {isExpanded && module.lessons.length === 0 && (
                          <p className="mt-3 ml-14 text-sm text-muted-foreground">
                            No lessons in this module
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                This course has no modules yet
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
