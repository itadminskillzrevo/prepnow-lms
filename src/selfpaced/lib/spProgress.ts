import { supabase } from '@/integrations/supabase/client';

export interface CourseProgress {
  total: number;
  completed: number;
  percent: number;
}

/**
 * Compute live progress per course for the given user & course IDs
 * by counting completed lesson_progress vs total lessons in each course.
 */
export async function computeSpProgress(
  userId: string,
  courseIds: string[],
): Promise<Record<string, CourseProgress>> {
  const result: Record<string, CourseProgress> = {};
  courseIds.forEach(id => (result[id] = { total: 0, completed: 0, percent: 0 }));
  if (!courseIds.length) return result;

  const { data: mods } = await supabase
    .from('selfpaced_modules')
    .select('id, course_id')
    .in('course_id', courseIds);
  const modArr = mods ?? [];
  const modToCourse = new Map<string, string>();
  modArr.forEach(m => modToCourse.set(m.id, m.course_id));
  const modIds = modArr.map(m => m.id);
  if (!modIds.length) return result;

  const { data: lessons } = await supabase
    .from('selfpaced_lessons')
    .select('id, module_id')
    .in('module_id', modIds);
  const lessonArr = lessons ?? [];
  const lessonToCourse = new Map<string, string>();
  lessonArr.forEach(l => {
    const cid = modToCourse.get(l.module_id);
    if (cid) {
      lessonToCourse.set(l.id, cid);
      result[cid].total += 1;
    }
  });

  if (lessonArr.length) {
    const { data: prog } = await supabase
      .from('selfpaced_lesson_progress')
      .select('lesson_id, is_completed')
      .eq('user_id', userId)
      .eq('is_completed', true)
      .in('lesson_id', lessonArr.map(l => l.id));
    (prog ?? []).forEach(p => {
      const cid = lessonToCourse.get(p.lesson_id);
      if (cid) result[cid].completed += 1;
    });
  }

  Object.values(result).forEach(r => {
    r.percent = r.total ? Math.round((r.completed / r.total) * 100) : 0;
  });
  return result;
}
