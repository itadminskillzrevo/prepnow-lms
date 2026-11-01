import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Calendar, Users, Loader2 } from 'lucide-react';

interface BatchWithCount {
  id: string;
  course_id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  max_students: number | null;
  status: string | null;
  enrollment_count: number;
}

interface BatchSelectorProps {
  courseId: string;
  selectedBatchId: string | null;
  onBatchSelect: (batchId: string | null) => void;
}

export const BatchSelector: React.FC<BatchSelectorProps> = ({
  courseId,
  selectedBatchId,
  onBatchSelect,
}) => {
  const { data: batches, isLoading } = useQuery({
    queryKey: ['course-batches', courseId],
    queryFn: async (): Promise<BatchWithCount[]> => {
      const { data: batchList, error } = await supabase
        .from('batches')
        .select('*')
        .eq('course_id', courseId)
        .in('status', ['upcoming', 'active'])
        .order('start_date');

      if (error) throw error;

      // Get enrollment counts
      if (batchList && batchList.length > 0) {
        const batchIds = batchList.map(b => b.id);
        const { data: enrollments } = await supabase
          .from('batch_enrollments')
          .select('batch_id')
          .in('batch_id', batchIds);

        const enrollmentCounts = batchIds.reduce((acc, id) => {
          acc[id] = enrollments?.filter(e => e.batch_id === id).length || 0;
          return acc;
        }, {} as Record<string, number>);

        return batchList.map(batch => ({
          ...batch,
          enrollment_count: enrollmentCounts[batch.id] || 0,
        }));
      }

      return (batchList || []).map(b => ({ ...b, enrollment_count: 0 }));
    },
    enabled: !!courseId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!batches || batches.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold">Select a Batch</Label>
      <p className="text-sm text-muted-foreground">
        Choose a batch to join for live classes and scheduled activities
      </p>
      
      <RadioGroup
        value={selectedBatchId || ''}
        onValueChange={(value) => onBatchSelect(value || null)}
        className="space-y-3"
      >
        {batches.map((batch) => {
          const isFull = batch.enrollment_count >= (batch.max_students || 50);
          const spotsLeft = (batch.max_students || 50) - batch.enrollment_count;

          return (
            <div key={batch.id}>
              <RadioGroupItem
                value={batch.id}
                id={batch.id}
                className="peer sr-only"
                disabled={isFull}
              />
              <Label
                htmlFor={batch.id}
                className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-all
                  ${isFull ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/50'}
                  peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5`}
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{batch.name}</span>
                    <Badge variant={batch.status === 'active' ? 'default' : 'secondary'}>
                      {batch.status}
                    </Badge>
                    {isFull && (
                      <Badge variant="destructive">Full</Badge>
                    )}
                  </div>
                  
                  {batch.description && (
                    <p className="text-sm text-muted-foreground">{batch.description}</p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {format(new Date(batch.start_date), 'MMM d, yyyy')}
                        {batch.end_date && ` - ${format(new Date(batch.end_date), 'MMM d, yyyy')}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>
                        {spotsLeft > 0 ? `${spotsLeft} spots left` : 'No spots available'}
                      </span>
                    </div>
                  </div>
                </div>
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
};