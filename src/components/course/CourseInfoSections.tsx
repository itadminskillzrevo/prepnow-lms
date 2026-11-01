import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Target,
  Sparkles,
  Wrench,
  GraduationCap,
  CheckCircle,
  Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface CourseInfoSectionsProps {
  course: {
    title: string;
    description: string | null;
    price: number | null;
    duration_hours: number | null;
    difficulty_level: string | null;
    category: string | null;
    program_overview?: string | null;
    what_you_will_learn?: string[] | null;
    key_highlights?: string[] | null;
    tools_covered?: string[] | null;
    skills_developed?: string[] | null;
  };
}

export const CourseInfoSections: React.FC<CourseInfoSectionsProps> = ({ course }) => {
  const programOverview = course.program_overview || course.description || 'This comprehensive program is designed to equip you with industry-relevant skills and knowledge.';

  const whatYouWillLearn = course.what_you_will_learn?.length
    ? course.what_you_will_learn
    : [];

  const keyHighlights = course.key_highlights?.length 
    ? course.key_highlights 
    : [];

  const toolsCovered = course.tools_covered?.length 
    ? course.tools_covered 
    : [];

  const skillsDeveloped = course.skills_developed?.length 
    ? course.skills_developed 
    : [];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Program Overview */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
              Program Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <p className="text-muted-foreground leading-relaxed">
              {programOverview}
            </p>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-primary">{course.duration_hours || 40}+</p>
                <p className="text-xs text-muted-foreground">Hours of Learning</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-primary">10+</p>
                <p className="text-xs text-muted-foreground">Projects</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-primary">24/7</p>
                <p className="text-xs text-muted-foreground">Support</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-primary">100%</p>
                <p className="text-xs text-muted-foreground">Practical</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* What You Will Learn */}
      {whatYouWillLearn.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-accent/5 to-accent/10 pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-accent" />
                </div>
                What You Will Learn
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid sm:grid-cols-2 gap-3">
                {whatYouWillLearn.map((item, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Key Highlights */}
      {keyHighlights.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                Key Highlights
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid sm:grid-cols-2 gap-3">
                {keyHighlights.map((highlight, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <CheckCircle className="h-5 w-5 text-success shrink-0" />
                    <span className="text-sm font-medium">{highlight}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tools Covered */}
      {toolsCovered.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-info/5 to-info/10 pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                  <Wrench className="h-5 w-5 text-info" />
                </div>
                Tools Covered
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="flex flex-wrap gap-2">
                {toolsCovered.map((tool, index) => (
                  <Badge 
                    key={index}
                    variant="secondary"
                    className="px-4 py-2 text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 border-0"
                  >
                    {tool}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Skills Developed */}
      {skillsDeveloped.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-success/5 to-success/10 pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-success" />
                </div>
                Skills Developed After Completion
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {skillsDeveloped.map((skill, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-success/30 hover:bg-success/5 transition-all"
                  >
                    <Zap className="h-4 w-4 text-success shrink-0" />
                    <span className="text-sm font-medium">{skill}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};
