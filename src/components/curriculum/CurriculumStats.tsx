import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Layers, FileText, Clock, BookOpen, Users, AlertTriangle } from 'lucide-react';

interface CurriculumStatsProps {
  totalModules: number;
  totalSubModules: number;
  totalLessons: number;
  totalDurationMinutes: number;
  courseCount?: number;
  batchCount?: number;
}

export const CurriculumStats: React.FC<CurriculumStatsProps> = ({
  totalModules,
  totalSubModules,
  totalLessons,
  totalDurationMinutes,
  courseCount = 0,
  batchCount = 0,
}) => {
  const hours = Math.floor(totalDurationMinutes / 60);
  const minutes = totalDurationMinutes % 60;
  const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/20">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalModules}</p>
                <p className="text-xs text-muted-foreground">Modules</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary/30 to-secondary/50 border-secondary/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-secondary">
                <BookOpen className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalSubModules}</p>
                <p className="text-xs text-muted-foreground">Sub-modules</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/30 to-accent/50 border-accent/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent">
                <FileText className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalLessons}</p>
                <p className="text-xs text-muted-foreground">Lessons</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-muted/50 to-muted border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-muted-foreground/10">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{durationText}</p>
                <p className="text-xs text-muted-foreground">Duration</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{courseCount + batchCount}</p>
                <p className="text-xs text-muted-foreground">In Use</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {(courseCount > 0 || batchCount > 0) && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              <p className="text-sm">
                <span className="font-medium">This curriculum is in use.</span> Changes will reflect
                in {courseCount} course{courseCount !== 1 ? 's' : ''} and {batchCount} batch
                {batchCount !== 1 ? 'es' : ''}.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
