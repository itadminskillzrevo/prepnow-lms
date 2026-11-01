import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ModuleItem } from './CurriculumTreeItem';
import { Plus, Layers, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  video_url: string | null;
  duration_minutes: number;
  is_free: boolean;
}

interface SubModule {
  id: string;
  title: string;
  description: string | null;
  lessons?: Lesson[];
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  sub_modules?: SubModule[];
  lessons?: Lesson[];
}

interface CurriculumTreeProps {
  modules: Module[];
  isLoading: boolean;
  onAddModule: () => void;
  onEditModule: (module: Module) => void;
  onDeleteModule: (moduleId: string) => void;
  onAddSubModule: (moduleId: string) => void;
  onEditSubModule: (subModule: SubModule) => void;
  onDeleteSubModule: (subModuleId: string) => void;
  onAddLesson: (moduleId: string, subModuleId?: string) => void;
  onEditLesson: (lesson: Lesson) => void;
  onDeleteLesson: (lessonId: string) => void;
}

export const CurriculumTree: React.FC<CurriculumTreeProps> = ({
  modules,
  isLoading,
  onAddModule,
  onEditModule,
  onDeleteModule,
  onAddSubModule,
  onEditSubModule,
  onDeleteSubModule,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
}) => {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(modules.map((m) => m.id)));
  const [expandedSubModules, setExpandedSubModules] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const toggleModule = (moduleId: string) => {
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

  const toggleSubModule = (subModuleId: string) => {
    setExpandedSubModules((prev) => {
      const next = new Set(prev);
      if (next.has(subModuleId)) {
        next.delete(subModuleId);
      } else {
        next.add(subModuleId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedModules(new Set(modules.map((m) => m.id)));
    const allSubModules = modules.flatMap((m) => m.sub_modules?.map((sm) => sm.id) || []);
    setExpandedSubModules(new Set(allSubModules));
  };

  const collapseAll = () => {
    setExpandedModules(new Set());
    setExpandedSubModules(new Set());
  };

  // Filter modules based on search
  const filteredModules = searchTerm
    ? modules.filter(
        (m) =>
          m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.sub_modules?.some((sm) =>
            sm.title.toLowerCase().includes(searchTerm.toLowerCase())
          ) ||
          m.lessons?.some((l) => l.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
          m.sub_modules?.some((sm) =>
            sm.lessons?.some((l) => l.title.toLowerCase().includes(searchTerm.toLowerCase()))
          )
      )
    : modules;

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Curriculum Structure
            </CardTitle>
            <CardDescription className="mt-1">
              Organize modules, sub-modules, and lessons in a hierarchical structure
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Collapse All
            </Button>
            <Button size="sm" className="gap-1.5" onClick={onAddModule}>
              <Plus className="h-4 w-4" />
              Add Module
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search modules, lessons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredModules && filteredModules.length > 0 ? (
          <div className="space-y-4">
            {filteredModules.map((module, idx) => (
              <ModuleItem
                key={module.id}
                module={module}
                moduleIndex={idx}
                isExpanded={expandedModules.has(module.id)}
                expandedSubModules={expandedSubModules}
                onToggle={() => toggleModule(module.id)}
                onToggleSubModule={toggleSubModule}
                onEdit={() => onEditModule(module)}
                onDelete={() => onDeleteModule(module.id)}
                onAddSubModule={() => onAddSubModule(module.id)}
                onAddLesson={(subModuleId) => onAddLesson(module.id, subModuleId)}
                onEditSubModule={onEditSubModule}
                onDeleteSubModule={onDeleteSubModule}
                onEditLesson={onEditLesson}
                onDeleteLesson={onDeleteLesson}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
              <Layers className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No modules yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Start building your curriculum by adding the first module. Modules are the main
              sections of your course.
            </p>
            <Button onClick={onAddModule} size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Create First Module
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
