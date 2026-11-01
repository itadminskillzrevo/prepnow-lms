import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Star, BookOpen, ChevronRight, Sparkles, Video, Radio, GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';

export const PopularCourses: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('order_index');
      if (error) throw error;
      return data;
    },
  });

  // Fetch published courses with their categories
  const { data: displayCourses = [], isLoading } = useQuery({
    queryKey: ['popular-courses', selectedCategory, selectedType, categories],
    queryFn: async () => {
      if (selectedCategory !== 'all') {
        let query = supabase
          .from('courses')
          .select(`*, course_categories!inner(category_id)`)
          .eq('is_published', true)
          .eq('approval_status', 'approved')
          .eq('course_categories.category_id', selectedCategory);
        if (selectedType !== 'all') query = query.eq('course_type', selectedType);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      } else {
        let query = supabase
          .from('courses')
          .select(`*, course_categories(category_id)`)
          .eq('is_published', true)
          .eq('approval_status', 'approved');
        if (selectedType !== 'all') query = query.eq('course_type', selectedType);
        const { data, error } = await query;
        if (error) throw error;
        
        // Sort by category order_index
        const categoryOrderMap = new Map<string, number>();
        categories.forEach((cat: any) => {
          categoryOrderMap.set(cat.id, cat.order_index ?? 999);
        });
        
        const sorted = (data || []).sort((a: any, b: any) => {
          const aCatId = a.course_categories?.[0]?.category_id;
          const bCatId = b.course_categories?.[0]?.category_id;
          const aOrder = aCatId ? (categoryOrderMap.get(aCatId) ?? 999) : 999;
          const bOrder = bCatId ? (categoryOrderMap.get(bCatId) ?? 999) : 999;
          if (aOrder !== bOrder) return aOrder - bOrder;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        
        return sorted.slice(0, 6);
      }
    },
  });

  return (
    <section id="popular-courses" className="py-8 md:py-12 relative">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-10 md:mb-16"
        >
          <span className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-medium mb-4 md:mb-6">
            <Sparkles className="h-3 w-3 md:h-4 md:w-4" />
            Popular Courses
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold mb-4 md:mb-6 tracking-tight">
            Explore Our <span className="text-primary">Top Courses</span>
          </h2>
          <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto px-2">
            Discover trending courses across multiple categories and start your learning journey today.
          </p>
        </motion.div>

        {/* Course Type Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
          className="flex justify-center gap-2 md:gap-3 mb-4 md:mb-6"
        >
          {[
            { value: 'all', label: 'All Courses' },
            { value: 'live', label: 'Live Courses' },
            { value: 'self_paced', label: 'Self-Paced Courses' },
          ].map((type) => (
            <Button
              key={type.value}
              variant={selectedType === type.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType(type.value)}
              className="rounded-full text-xs md:text-sm"
            >
              {type.label}
            </Button>
          ))}
        </motion.div>

        {/* Category Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-2 md:gap-3 mb-8 md:mb-12"
        >
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
            className="rounded-full text-xs md:text-sm"
          >
            All Categories
          </Button>
          {categories.map((category: any) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className="rounded-full text-xs md:text-sm"
            >
              {category.name}
            </Button>
          ))}
        </motion.div>

        {/* Courses Grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-0">
                  <div className="h-40 md:h-48 bg-muted rounded-t-lg" />
                  <div className="p-4 md:p-5 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : displayCourses.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {displayCourses.map((course: any, index: number) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 group glass-card"
                  onClick={() => navigate(`/courses/${course.id}`)}
                >
                  <CardContent className="p-0">
                    <div className="h-40 md:h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden relative">
                      {course.thumbnail_url ? (
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <BookOpen className="h-12 w-12 md:h-16 md:w-16 text-primary/40" />
                      )}
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
                    <div className="p-4 md:p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="secondary" className="text-xs">
                          {course.category || 'General'}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {course.difficulty_level}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-base md:text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-muted-foreground text-xs md:text-sm mb-4 line-clamp-2">
                        {course.description || 'No description available'}
                      </p>
                      <div className="flex items-center justify-between text-xs md:text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 md:h-4 md:w-4" />
                          {course.duration_hours}h
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 md:h-4 md:w-4 text-warning" />
                          4.8
                        </span>
                        <span className="font-semibold text-green-600 dark:text-green-400 text-xs">
                          Scholarship up to 30%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 md:py-20"
          >
            <BookOpen className="mx-auto h-12 w-12 md:h-16 md:w-16 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg md:text-xl font-semibold">No courses found</h3>
            <p className="text-muted-foreground mt-2 text-sm md:text-base">
              Check back soon for new courses in this category.
            </p>
          </motion.div>
        )}

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true }}
          className="text-center mt-8 md:mt-12"
        >
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate('/courses')}
            className="rounded-full text-base md:text-lg px-6 md:px-8"
          >
            View All Courses
            <ChevronRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};
