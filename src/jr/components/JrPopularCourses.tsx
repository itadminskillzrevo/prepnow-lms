import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Star, BookOpen, ChevronRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export const JrPopularCourses: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { data: categories = [] } = useQuery({
    queryKey: ['jr-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jr_categories')
        .select('*')
        .eq('is_active', true)
        .order('order_index');
      if (error) throw error;
      return data;
    },
  });

  const { data: displayCourses = [], isLoading } = useQuery({
    queryKey: ['jr-popular-courses', selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from('jr_courses')
        .select('*, jr_categories(name, color, icon)')
        .eq('is_published', true);
      if (selectedCategory !== 'all') query = query.eq('category_id', selectedCategory);
      const { data, error } = await query.order('created_at', { ascending: false }).limit(6);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <section id="jr-popular-courses" className="py-8 md:py-12 relative">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-10 md:mb-16"
        >
          <span className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-[hsl(var(--jr-primary)/0.12)] text-[hsl(var(--jr-primary))] text-xs md:text-sm font-medium mb-4 md:mb-6">
            <Sparkles className="h-3 w-3 md:h-4 md:w-4" />
            Popular Courses
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4 md:mb-6 tracking-tight">
            Explore Our <span className="text-[hsl(var(--jr-primary))]">Top Courses</span>
          </h2>
          <p className="text-[hsl(var(--jr-muted))] text-sm md:text-lg max-w-2xl mx-auto px-2">
            Fun and interactive courses designed for school students from Class 6 to 12.
          </p>
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
              {category.icon ? `${category.icon} ` : ''}{category.name}
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
                  className="overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 group border-2 border-[hsl(var(--jr-border))] rounded-2xl"
                  onClick={() => navigate(`/jr/courses/${course.id}`)}
                >
                  <CardContent className="p-0">
                    <div className="h-40 md:h-48 bg-gradient-to-br from-[hsl(var(--jr-primary)/0.2)] to-[hsl(var(--jr-pink)/0.2)] flex items-center justify-center overflow-hidden relative">
                      {course.thumbnail_url ? (
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="text-6xl">📘</div>
                      )}
                      {course.grade_level && (
                        <div className="absolute top-3 left-3">
                          <Badge className="text-xs bg-[hsl(var(--jr-secondary))] text-white border-0">
                            {course.grade_level}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="p-4 md:p-5">
                      {course.jr_categories?.name && (
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="secondary" className="text-xs">
                            {course.jr_categories.icon ? `${course.jr_categories.icon} ` : ''}{course.jr_categories.name}
                          </Badge>
                          {course.difficulty && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {course.difficulty}
                            </Badge>
                          )}
                        </div>
                      )}
                      <h3 className="font-extrabold text-base md:text-lg mb-2 line-clamp-2 group-hover:text-[hsl(var(--jr-primary))] transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-[hsl(var(--jr-muted))] text-xs md:text-sm mb-4 line-clamp-2">
                        {course.description || 'No description available'}
                      </p>
                      <div className="flex items-center justify-between text-xs md:text-sm text-[hsl(var(--jr-muted))]">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 md:h-4 md:w-4" />
                          {course.duration_hours || 0}h
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 md:h-4 md:w-4 text-yellow-500" />
                          4.8
                        </span>
                        <span className="font-semibold text-[hsl(var(--jr-primary))] text-xs">
                          Start Learning
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
            <p className="text-[hsl(var(--jr-muted))] mt-2 text-sm md:text-base">
              Check back soon for new courses!
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
            onClick={() => navigate('/jr/courses')}
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
