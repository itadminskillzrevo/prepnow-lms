import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, ArrowLeft, BookOpen, Layers } from 'lucide-react';

const CreateCourse: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    courseName: '',
    curriculumName: '',
    description: '',
    category: '',
    difficulty_level: 'beginner',
    duration_hours: 0,
    price: 0,
    course_type: 'live',
    requirements: '',
    program_overview: '',
    what_you_will_learn: '',
    key_highlights: '',
    tools_covered: '',
    skills_developed: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user?.id) throw new Error('Please sign in again');

      const courseName = data.courseName.trim();
      const curriculumName = data.curriculumName.trim() || courseName;
      
      // Step 1: Create the curriculum first
      const { data: curriculum, error: curriculumError } = await supabase
        .from('curriculums')
        .insert({
          name: curriculumName,
          description: `Curriculum for ${courseName}`,
          created_by: user.id,
          status: 'draft',
        })
        .select('id')
        .single();
      
      if (curriculumError) throw curriculumError;
      
      // Step 2: Create the course linked to the curriculum
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .insert({
          title: courseName,
          description: data.description,
          category: data.category,
          difficulty_level: data.difficulty_level,
          duration_hours: data.duration_hours,
          price: data.price,
          instructor_id: user.id,
          is_published: false,
          curriculum_id: curriculum.id,
          course_type: data.course_type,
          requirements: data.requirements ? data.requirements.split('\n').filter((r: string) => r.trim()) : [],
          program_overview: data.program_overview || null,
          what_you_will_learn: data.what_you_will_learn ? data.what_you_will_learn.split('\n').filter((w: string) => w.trim()) : [],
          key_highlights: data.key_highlights ? data.key_highlights.split('\n').filter(h => h.trim()) : [],
          tools_covered: data.tools_covered ? data.tools_covered.split(',').map(t => t.trim()).filter(t => t) : [],
          skills_developed: data.skills_developed ? data.skills_developed.split('\n').filter(s => s.trim()) : [],
        })
        .select()
        .single();
      
      if (courseError) throw courseError;
      
      return course;
    },
    onSuccess: (course) => {
      toast.success('Course and curriculum created successfully!');
      navigate(`/courses/${course.id}`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create course');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.courseName.trim()) {
      toast.error('Please enter a course name');
      return;
    }
    createMutation.mutate(formData);
  };

  // Fetch categories from database
  const { data: categories = [] } = useQuery({
    queryKey: ['categories-for-course'],
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

  const difficulties = ['beginner', 'intermediate', 'advanced'];

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold">Create New Course</h1>
            <p className="text-muted-foreground mt-1">
              Create a course with its own curriculum
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Course & Curriculum Details
            </CardTitle>
            <CardDescription>
              Both course and curriculum will be created together and linked automatically
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Course Type Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Course Type *
                </Label>
                <Select
                  value={formData.course_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, course_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select course type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live">
                      <div className="flex items-center gap-2">
                        <span>🔴 Live Course</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="self_paced">
                      <div className="flex items-center gap-2">
                        <span>📹 Self-Paced Course</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.course_type === 'live'
                    ? 'Live courses include scheduled classes, batches, and real-time instruction.'
                    : 'Self-paced courses allow students to learn anytime through recorded video lessons.'}
                </p>
              </div>

              {/* Course & Curriculum Names */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="courseName" className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Course Name *
                  </Label>
                  <Input
                    id="courseName"
                    placeholder="e.g., Complete Web Development Bootcamp"
                    value={formData.courseName}
                    onChange={(e) =>
                      setFormData({ ...formData, courseName: e.target.value })
                    }
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="curriculumName" className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Curriculum Name (optional)
                  </Label>
                  <Input
                    id="curriculumName"
                    placeholder="Leave blank to auto-use Course Name"
                    value={formData.curriculumName}
                    onChange={(e) =>
                      setFormData({ ...formData, curriculumName: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what students will learn..."
                  rows={4}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select
                    value={formData.difficulty_level}
                    onValueChange={(value) =>
                      setFormData({ ...formData, difficulty_level: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      {difficulties.map((diff) => (
                        <SelectItem key={diff} value={diff}>
                          {diff.charAt(0).toUpperCase() + diff.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (hours)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="0"
                    value={formData.duration_hours}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration_hours: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price (₹ INR)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Set to 0 for a free course. Price in Indian Rupees (₹).
                  </p>
                </div>
              </div>

              {/* Course Detail Sections */}
              <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Course Content Sections
                </h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="program_overview">Program Overview</Label>
                    <Textarea
                      id="program_overview"
                      placeholder="Describe the program overview, what students will learn..."
                      rows={3}
                      value={formData.program_overview}
                      onChange={(e) =>
                        setFormData({ ...formData, program_overview: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="what_you_will_learn">What You Will Learn</Label>
                    <Textarea
                      id="what_you_will_learn"
                      placeholder="Enter each learning outcome on a new line:&#10;Build responsive websites&#10;Master React framework&#10;Deploy applications to cloud"
                      rows={4}
                      value={formData.what_you_will_learn}
                      onChange={(e) =>
                        setFormData({ ...formData, what_you_will_learn: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">Enter each learning point on a new line</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="key_highlights">Key Highlights</Label>
                    <Textarea
                      id="key_highlights"
                      placeholder="Enter each highlight on a new line:&#10;Industry-recognized certification&#10;Hands-on projects&#10;Live instructor sessions"
                      rows={4}
                      value={formData.key_highlights}
                      onChange={(e) =>
                        setFormData({ ...formData, key_highlights: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">Enter each highlight on a new line</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tools_covered">Tools Covered</Label>
                    <Textarea
                      id="tools_covered"
                      placeholder="Python, TensorFlow, SQL, Tableau, Excel"
                      rows={2}
                      value={formData.tools_covered}
                      onChange={(e) =>
                        setFormData({ ...formData, tools_covered: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">Separate tools with commas</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="skills_developed">Skills Developed After Completion</Label>
                    <Textarea
                      id="skills_developed"
                      placeholder="Enter each skill on a new line:&#10;Data Analysis&#10;Problem Solving&#10;Critical Thinking"
                      rows={4}
                      value={formData.skills_developed}
                      onChange={(e) =>
                        setFormData({ ...formData, skills_developed: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">Enter each skill on a new line</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requirements">Course Requirements</Label>
                    <Textarea
                      id="requirements"
                      placeholder="Enter each requirement on a new line:&#10;No prior programming experience needed&#10;Laptop with internet connection&#10;Basic computer skills"
                      rows={4}
                      value={formData.requirements}
                      onChange={(e) =>
                        setFormData({ ...formData, requirements: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">Enter each requirement on a new line</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Course & Curriculum'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CreateCourse;
