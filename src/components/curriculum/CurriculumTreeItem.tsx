import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Edit,
  Trash2,
  Plus,
  Video,
  FileText,
  BookOpen,
  FolderOpen,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LessonItemProps {
  lesson: {
    id: string;
    title: string;
    video_url: string | null;
    duration_minutes: number;
    is_free: boolean;
  };
  numbering: string;
  onEdit: () => void;
  onDelete: () => void;
}

export const LessonItem: React.FC<LessonItemProps> = ({
  lesson,
  numbering,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="group flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/60 transition-colors border border-transparent hover:border-border/50">
      <div className="flex items-center justify-center w-6 h-6 rounded bg-muted text-xs font-medium text-muted-foreground">
        {numbering}
      </div>
      <div className={cn(
        "flex items-center justify-center w-8 h-8 rounded-lg",
        lesson.video_url ? "bg-primary/10" : "bg-muted"
      )}>
        {lesson.video_url ? (
          <Video className="h-4 w-4 text-primary" />
        ) : (
          <FileText className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{lesson.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {lesson.duration_minutes || 0} min
          </span>
          {lesson.is_free && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Free
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
          <Edit className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

interface SubModuleItemProps {
  subModule: {
    id: string;
    title: string;
    description: string | null;
    lessons?: {
      id: string;
      title: string;
      video_url: string | null;
      duration_minutes: number;
      is_free: boolean;
    }[];
  };
  moduleIndex: number;
  subModuleIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddLesson: () => void;
  onEditLesson: (lesson: any) => void;
  onDeleteLesson: (lessonId: string) => void;
}

export const SubModuleItem: React.FC<SubModuleItemProps> = ({
  subModule,
  moduleIndex,
  subModuleIndex,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
}) => {
  const lessonCount = subModule.lessons?.length || 0;
  const totalDuration = subModule.lessons?.reduce((sum, l) => sum + (l.duration_minutes || 0), 0) || 0;

  return (
    <div className="border border-border/60 rounded-xl bg-card/50 overflow-hidden">
      {/* Sub-module Header */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/40 transition-colors"
        onClick={onToggle}
      >
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary/80">
          <FolderOpen className="h-4 w-4 text-secondary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {moduleIndex + 1}.{subModuleIndex + 1}
            </span>
            <p className="font-semibold text-sm truncate">{subModule.title}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {lessonCount} lesson{lessonCount !== 1 ? 's' : ''} • {totalDuration} min
          </p>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onAddLesson}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Sub-module Lessons */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1">
          {subModule.lessons && subModule.lessons.length > 0 ? (
            <div className="ml-9 space-y-1 border-l-2 border-dashed border-border/60 pl-4">
              {subModule.lessons.map((lesson, lIdx) => (
                <LessonItem
                  key={lesson.id}
                  lesson={lesson}
                  numbering={`${moduleIndex + 1}.${subModuleIndex + 1}.${lIdx + 1}`}
                  onEdit={() => onEditLesson(lesson)}
                  onDelete={() => onDeleteLesson(lesson.id)}
                />
              ))}
            </div>
          ) : (
            <div className="ml-9 py-4 text-center">
              <p className="text-sm text-muted-foreground">No lessons yet</p>
              <Button variant="link" size="sm" className="mt-1" onClick={onAddLesson}>
                <Plus className="h-3 w-3 mr-1" /> Add first lesson
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface ModuleItemProps {
  module: {
    id: string;
    title: string;
    description: string | null;
    sub_modules?: {
      id: string;
      title: string;
      description: string | null;
      lessons?: any[];
    }[];
    lessons?: any[];
  };
  moduleIndex: number;
  isExpanded: boolean;
  expandedSubModules: Set<string>;
  onToggle: () => void;
  onToggleSubModule: (subModuleId: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddSubModule: () => void;
  onAddLesson: (subModuleId?: string) => void;
  onEditSubModule: (subModule: any) => void;
  onDeleteSubModule: (subModuleId: string) => void;
  onEditLesson: (lesson: any) => void;
  onDeleteLesson: (lessonId: string) => void;
}

export const ModuleItem: React.FC<ModuleItemProps> = ({
  module,
  moduleIndex,
  isExpanded,
  expandedSubModules,
  onToggle,
  onToggleSubModule,
  onEdit,
  onDelete,
  onAddSubModule,
  onAddLesson,
  onEditSubModule,
  onDeleteSubModule,
  onEditLesson,
  onDeleteLesson,
}) => {
  const directLessons = module.lessons || [];
  const subModules = module.sub_modules || [];
  const totalLessons =
    directLessons.length + subModules.reduce((sum, sm) => sum + (sm.lessons?.length || 0), 0);
  const totalDuration =
    directLessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0) +
    subModules.reduce(
      (sum, sm) => sum + (sm.lessons?.reduce((s: number, l: any) => s + (l.duration_minutes || 0), 0) || 0),
      0
    );

  return (
    <div className="border border-border rounded-2xl bg-card shadow-sm overflow-hidden">
      {/* Module Header */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors border-b border-border/50"
        onClick={onToggle}
      >
        <div className="text-muted-foreground hover:text-foreground cursor-grab">
          <GripVertical className="h-5 w-5" />
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </Button>
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary font-bold">
          {moduleIndex + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-base truncate">{module.title}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              {totalLessons} lesson{totalLessons !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <FolderOpen className="h-3 w-3" />
              {subModules.length} sub-module{subModules.length !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {Math.round(totalDuration / 60) > 0
                ? `${Math.round(totalDuration / 60)}h ${totalDuration % 60}m`
                : `${totalDuration}m`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={onAddSubModule}>
            <Plus className="h-3.5 w-3.5" /> Sub-module
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => onAddLesson()}>
            <Plus className="h-3.5 w-3.5" /> Lesson
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Module Content */}
      {isExpanded && (
        <div className="p-4 space-y-4 bg-muted/20">
          {/* Direct Lessons */}
          {directLessons.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
                Direct Lessons
              </p>
              <div className="space-y-1 border-l-2 border-primary/30 pl-4 ml-2">
                {directLessons.map((lesson: any, lIdx: number) => (
                  <LessonItem
                    key={lesson.id}
                    lesson={lesson}
                    numbering={`${moduleIndex + 1}.${lIdx + 1}`}
                    onEdit={() => onEditLesson(lesson)}
                    onDelete={() => onDeleteLesson(lesson.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sub-modules */}
          {subModules.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
                Sub-modules
              </p>
              <div className="space-y-2">
                {subModules.map((subModule: any, smIdx: number) => (
                  <SubModuleItem
                    key={subModule.id}
                    subModule={subModule}
                    moduleIndex={moduleIndex}
                    subModuleIndex={smIdx}
                    isExpanded={expandedSubModules.has(subModule.id)}
                    onToggle={() => onToggleSubModule(subModule.id)}
                    onEdit={() => onEditSubModule(subModule)}
                    onDelete={() => onDeleteSubModule(subModule.id)}
                    onAddLesson={() => onAddLesson(subModule.id)}
                    onEditLesson={onEditLesson}
                    onDeleteLesson={onDeleteLesson}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {directLessons.length === 0 && subModules.length === 0 && (
            <div className="text-center py-8">
              <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm mb-3">
                Start adding content to this module
              </p>
              <div className="flex justify-center gap-2">
                <Button size="sm" variant="outline" onClick={onAddSubModule}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Sub-module
                </Button>
                <Button size="sm" variant="default" onClick={() => onAddLesson()}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Lesson
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
