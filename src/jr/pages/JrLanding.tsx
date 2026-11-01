import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Rocket, Sparkles, Star, Trophy, BookOpen, PlayCircle, Target, Zap, ChevronRight, CheckCircle, Award, Users } from 'lucide-react';
import { JrLayout } from '@/jr/components/JrLayout';
import { JrPopularCourses } from '@/jr/components/JrPopularCourses';

const features = [
  { icon: BookOpen, title: 'Fun Lessons', description: 'Bite-sized lessons designed to make learning enjoyable for school students.' },
  { icon: PlayCircle, title: 'Interactive Quizzes', description: 'Engaging quizzes and games that make learning stick.' },
  { icon: Award, title: 'Earn Badges', description: 'Unlock badges and certificates as you complete each adventure.' },
  { icon: Users, title: 'Expert Mentors', description: 'Learn from teachers who know how to make any subject exciting.' },
];

const stats = [
  { value: '10K+', label: 'Happy Students' },
  { value: '200+', label: 'Fun Lessons' },
  { value: '50+', label: 'Expert Mentors' },
  { value: '95%', label: 'Love Learning' },
];

export default function JrLanding() {
  return (
    <JrLayout>
      {/* Hero Section */}
      <section className="relative pt-10 md:pt-16 pb-8 md:pb-12">
        <div className="container mx-auto px-4 md:px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-4xl mx-auto text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-full bg-[hsl(var(--jr-primary)/0.12)] border border-[hsl(var(--jr-primary)/0.25)] text-[hsl(var(--jr-primary))] text-xs md:text-sm font-medium mb-6 md:mb-8"
            >
              <Star className="h-3 w-3 md:h-4 md:w-4" />
              For Class 6 – 12 Students
            </motion.div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-extrabold mb-6 md:mb-8 leading-tight tracking-tight">
              Learning that feels like
              <br />
              <span className="bg-gradient-to-r from-[hsl(var(--jr-primary))] via-[hsl(var(--jr-pink))] to-[hsl(var(--jr-secondary))] bg-clip-text text-transparent">
                play time! ✨
              </span>
            </h1>

            <p className="text-base md:text-xl text-[hsl(var(--jr-muted))] mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed px-2">
              Join SkillzRevo Junior — a magical place where school students explore subjects with games,
              quizzes, badges, and live mentors.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center px-4 sm:px-0">
              <Link to="/jr/auth?mode=signup" className="jr-btn">
                <Rocket className="h-4 w-4 md:h-5 md:w-5" /> Start Learning Free
              </Link>
              <Link to="/jr/courses" className="jr-btn jr-btn-secondary">
                <PlayCircle className="h-4 w-4 md:h-5 md:w-5" /> Explore Courses
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-10 md:mt-14 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                className="jr-card p-4 md:p-6 text-center group hover:scale-105 transition-transform duration-300"
              >
                <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-[hsl(var(--jr-primary))] mb-1 md:mb-2">
                  {stat.value}
                </p>
                <p className="text-xs md:text-sm text-[hsl(var(--jr-muted))]">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-8 md:py-12 relative">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-10 md:mb-16"
          >
            <span className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-[hsl(var(--jr-primary)/0.12)] text-[hsl(var(--jr-primary))] text-xs md:text-sm font-medium mb-4 md:mb-6">
              <Target className="h-3 w-3 md:h-4 md:w-4" />
              Why Choose Us
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4 md:mb-6 tracking-tight">
              Why Kids Love <span className="text-[hsl(var(--jr-primary))]">SkillzRevo Jr</span>?
            </h2>
            <p className="text-[hsl(var(--jr-muted))] text-sm md:text-lg max-w-2xl mx-auto px-2">
              Everything designed to make learning your favourite hobby.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="jr-card p-6 md:p-8 group hover:scale-105 transition-all duration-300"
              >
                <div className="h-12 w-12 md:h-16 md:w-16 rounded-xl md:rounded-2xl bg-gradient-to-br from-[hsl(var(--jr-primary))] to-[hsl(var(--jr-pink))] flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  <feature.icon className="h-6 w-6 md:h-8 md:w-8 text-white" />
                </div>
                <h3 className="text-lg md:text-xl font-extrabold mb-2 md:mb-3">{feature.title}</h3>
                <p className="text-sm md:text-base text-[hsl(var(--jr-muted))] leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Courses (Jr) */}
      <JrPopularCourses />

      {/* CTA Section */}
      <section className="py-8 md:py-12 relative">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-[hsl(var(--jr-primary))] via-[hsl(var(--jr-pink))] to-[hsl(var(--jr-secondary))] p-8 md:p-12 lg:p-16"
          >
            <div className="absolute -top-20 -left-20 w-40 md:w-72 h-40 md:h-72 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -right-20 w-48 md:w-96 h-48 md:h-96 bg-white/10 rounded-full blur-3xl" />

            <div className="relative max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-white/20 text-white text-xs md:text-sm font-medium mb-4 md:mb-6">
                <Zap className="h-3 w-3 md:h-4 md:w-4" />
                Start Learning Today
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-4 md:mb-6 tracking-tight">
                Ready to Start Your Adventure? 🚀
              </h2>
              <p className="text-white/90 text-sm md:text-lg mb-8 md:mb-10 max-w-xl mx-auto px-2">
                Create your free account in 30 seconds and join thousands of curious kids today.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center px-4 sm:px-0">
                <Link
                  to="/jr/auth?mode=signup"
                  className="inline-flex items-center justify-center gap-2 rounded-full text-base md:text-lg px-6 md:px-8 py-3 bg-white text-[hsl(var(--jr-primary))] hover:bg-white/90 font-bold shadow-lg"
                >
                  Get Started Free
                  <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                </Link>
                <Link
                  to="/jr/courses"
                  className="inline-flex items-center justify-center gap-2 rounded-full text-base md:text-lg px-6 md:px-8 py-3 bg-[hsl(var(--jr-foreground))] text-white hover:opacity-90 font-bold"
                >
                  Browse Courses
                </Link>
              </div>
              <div className="mt-8 md:mt-10 flex flex-wrap items-center justify-center gap-4 md:gap-6 text-white/90 text-xs md:text-sm">
                <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4" /> Free to start</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4" /> No credit card</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4" /> Made for kids</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </JrLayout>
  );
}
