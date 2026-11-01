import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  GraduationCap,
  Search,
  Clock,
  Star,
  BookOpen,
  ArrowLeft,
  Video,
  Radio,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Users } from 'lucide-react';

const Courses: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, role } = useAuth();
  const isAdmin = role === 'admin' || role === 'superadmin';
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [courseType, setCourseType] = useState(searchParams.get('type') || 'all');

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

  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses', searchQuery, category, difficulty, courseType],
    queryFn: async () => {
      let query = supabase
        .from('courses')
        .select('*')
        .eq('is_published', true)
        .eq('approval_status', 'approved');

      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }
      if (category !== 'all') {
        query = query.eq('category', category);
      }
      if (difficulty !== 'all') {
        query = query.eq('difficulty_level', difficulty);
      }
      if (courseType !== 'all') {
        query = query.eq('course_type', courseType);
      }

      const { data } = await query.order('created_at', { ascending: false });
      return data || [];
    },
  });

  const difficulties = ['beginner', 'intermediate', 'advanced'];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-xl">Courses</span>
            </div>
          </div>
          {user ? (
            <Button onClick={() => navigate('/dashboard')}>Dashboard</Button>
          ) : (
            <Button variant="hero" onClick={() => navigate('/auth')}>
              Get Started
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Course Type Tabs */}
        <Tabs value={courseType} onValueChange={setCourseType} className="mb-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="all" className="gap-1.5">
              <BookOpen className="h-4 w-4" />
              All
            </TabsTrigger>
            <TabsTrigger value="live" className="gap-1.5">
              <Radio className="h-4 w-4" />
              Live
            </TabsTrigger>
            <TabsTrigger value="self_paced" className="gap-1.5">
              <Video className="h-4 w-4" />
              Self-Paced
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <Select value={category} onValueChange={setCategory}>
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
            <Select value={difficulty} onValueChange={setDifficulty}>
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

        {/* Courses Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-0">
                  <div className="h-48 bg-muted rounded-t-lg" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : courses && courses.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course: any) => (
              <Card
                key={course.id}
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 group"
                onClick={() => navigate(`/courses/${course.id}`)}
              >
                <CardContent className="p-0">
                  <div className="h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden relative">
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <BookOpen className="h-16 w-16 text-primary/40" />
                    )}
                    {/* Course type badge */}
                    <div className="absolute top-3 left-3">
                      <Badge className={`text-xs ${
                        course.course_type === 'self_paced' 
                          ? 'bg-blue-500/90 text-white border-0' 
                          : 'bg-red-500/90 text-white border-0'
                      }`}>
                        {course.course_type === 'self_paced' ? (
                          <><Video className="h-3 w-3 mr-1" /> Self-Paced</>
                        ) : (
                          <><Radio className="h-3 w-3 mr-1" /> Live</>
                        )}
                      </Badge>
                    </div>
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
                        <span className="font-semibold text-green-600 dark:text-green-400 text-xs">
                          Scholarship up to 30%
                        </span>
                    </div>
                    {isAdmin && (
                      <Button variant="outline" size="sm" className="mt-3 w-full" onClick={(e) => { e.stopPropagation(); navigate(`/admin/courses/${course.id}/students`); }}>
                        <Users className="w-4 h-4 mr-2" /> Students
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <BookOpen className="mx-auto h-16 w-16 text-muted-foreground/30" />
            <h3 className="mt-4 text-xl font-semibold">No courses found</h3>
            <p className="text-muted-foreground mt-2">
              Try adjusting your search or filters.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Courses;
