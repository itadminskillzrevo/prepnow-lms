import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { SiteLogo } from "@/components/branding/SiteLogo";
import {
  GraduationCap,
  BookOpen,
  Users,
  Award,
  PlayCircle,
  ChevronRight,
  CheckCircle,
  Sparkles,
  Target,
  Zap,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Menu,
  X,
  ArrowUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PopularCourses } from "@/components/home/PopularCourses";
import { KnowledgePartners } from "@/components/home/KnowledgePartners";
import { CertificateShowcase } from "@/components/home/CertificateShowcase";

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navLinks = [
    { label: "Home", href: "#" },
    { label: "Courses", href: "/courses" },
    { label: "About Us", href: "https://academy.skillzrevo.com/about-skillzrevo" },
    { label: "Contact Us", href: "https://academy.skillzrevo.com/contact-us" },
  ];

  const features = [
    {
      icon: BookOpen,
      title: "Expert-Led Courses",
      description: "Learn from industry professionals with real-world experience and proven track records.",
    },
    {
      icon: PlayCircle,
      title: "Interactive Learning",
      description: "Engage with video lessons, quizzes, and hands-on projects that reinforce your skills.",
    },
    {
      icon: Award,
      title: "Certifications",
      description: "Earn recognized certificates upon course completion to showcase your achievements.",
    },
    {
      icon: Users,
      title: "Community Support",
      description: "Connect with peers and instructors for collaborative learning experiences.",
    },
  ];

  const stats = [
    {
      value: "10K+",
      label: "Active Students",
    },
    {
      value: "500+",
      label: "Premium Courses",
    },
    {
      value: "100+",
      label: "Expert Instructors",
    },
    {
      value: "95%",
      label: "Success Rate",
    },
  ];

  const handleNavClick = (href: string) => {
    setMobileMenuOpen(false);
    if (href.startsWith("http")) {
      window.open(href, "_blank", "noopener,noreferrer");
    } else if (href.startsWith("/")) {
      navigate(href);
    } else if (href.startsWith("#")) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Floating Particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="particle particle-blue w-32 md:w-64 h-32 md:h-64 top-20 left-10 animate-glow-blob opacity-40" />
        <div
          className="particle particle-blue w-48 md:w-96 h-48 md:h-96 top-1/3 right-0 animate-glow-blob opacity-30"
          style={{
            animationDelay: "2s",
          }}
        />

        <div
          className="particle particle-orange w-24 md:w-48 h-24 md:h-48 bottom-40 left-1/4 animate-glow-blob opacity-25"
          style={{
            animationDelay: "4s",
          }}
        />

        <div
          className="particle particle-blue w-36 md:w-72 h-36 md:h-72 bottom-20 right-1/4 animate-glow-blob opacity-35"
          style={{
            animationDelay: "1s",
          }}
        />
      </div>

      {/* Header - White Background with Black Text */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 bg-card shadow-sm py-3 border-b border-border"
      >
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between">
            <SiteLogo size="header" textClassName="font-bold text-xl md:text-2xl text-foreground" />

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link, index) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(link.href);
                  }}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {link.label}
                </motion.a>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              {/* Dashboard Button - Hidden on mobile, visible on md+ */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="hidden md:block"
              >
                <Button
                  onClick={() => navigate(user ? "/dashboard" : "/auth")}
                  className="rounded-full bg-accent hover:bg-accent/90 text-accent-foreground font-medium px-6"
                >
                  Dashboard
                </Button>
              </motion.div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6 text-foreground" />
                ) : (
                  <Menu className="h-6 w-6 text-foreground" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden bg-white border-t border-border overflow-hidden"
            >
              <nav className="container mx-auto px-4 py-4 flex flex-col gap-2">
                {navLinks.map((link, index) => (
                  <motion.a
                    key={link.label}
                    href={link.href}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavClick(link.href);
                    }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="text-base font-medium text-foreground hover:text-primary transition-colors py-3 px-4 rounded-lg hover:bg-muted"
                  >
                    {link.label}
                  </motion.a>
                ))}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: navLinks.length * 0.05 }}
                  className="pt-2"
                >
                  <Button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate(user ? "/dashboard" : "/auth");
                    }}
                    className="w-full rounded-full bg-accent hover:bg-accent/90 text-accent-foreground font-medium"
                  >
                    Dashboard
                  </Button>
                </motion.div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Hero Section */}
      <section className="relative pt-28 md:pt-36 pb-8 md:pb-12">
        <div className="container mx-auto px-4 md:px-6 relative">
          <motion.div
            initial={{
              opacity: 0,
              y: 30,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.7,
            }}
            className="max-w-4xl mx-auto text-center"
          >
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.9,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              transition={{
                duration: 0.5,
              }}
              className="inline-flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs md:text-sm font-medium mb-6 md:mb-8"
            >
              <Sparkles className="h-3 w-3 md:h-4 md:w-4" />
              Transform Your Career Today
            </motion.div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-semibold text-foreground mb-6 md:mb-8 leading-tight tracking-tight">
              Learn New Skills &
              <br />
              <span className="text-gradient"> Accelerate </span>
              Your Growth
            </h1>

            <p className="text-base md:text-xl text-muted-foreground mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed px-2">
              Access world-class courses from industry experts. Master in-demand skills with our comprehensive learning
              platform.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center px-4 sm:px-0">
              <Button
                variant="hero"
                size="lg"
                onClick={() => navigate("/courses")}
                className="rounded-full text-base md:text-lg px-6 md:px-8 animate-pulse-glow w-full sm:w-auto"
              >
                Explore Courses
                <ChevronRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-full text-base md:text-lg px-6 md:px-8 border-2 w-full sm:w-auto"
                onClick={() => navigate("/courses")}
              >
                <PlayCircle className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Watch Demo
              </Button>
            </div>
          </motion.div>

          {/* Stats - Glass Cards */}
          <motion.div
            initial={{
              opacity: 0,
              y: 50,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.7,
              delay: 0.3,
            }}
            className="mt-10 md:mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.5,
                  delay: 0.4 + index * 0.1,
                }}
                className="glass-card p-4 md:p-6 text-center group hover:scale-105 transition-transform duration-300"
              >
                <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-primary mb-1 md:mb-2">
                  {stat.value}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Knowledge Partners Section */}
      <KnowledgePartners />

      {/* Features Section */}
      <section id="features" className="py-18 md:py-12relative">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.6,
            }}
            viewport={{
              once: true,
            }}
            className="text-center mb-10 md:mb-16"
          >
            <span className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-medium mb-4 md:mb-6">
              <Target className="h-3 w-3 md:h-4 md:w-4" />
              Why Choose Us
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold mb-4 md:mb-6 tracking-tight">
              Why Choose <span className="text-primary">SkillzRevo</span>?
            </h2>
            <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto px-2">
              Our platform offers everything you need to succeed in your learning journey.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{
                  opacity: 0,
                  y: 30,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1,
                }}
                viewport={{
                  once: true,
                }}
                className="glass-card p-6 md:p-8 group hover:scale-105 transition-all duration-300 hover:shadow-glow"
              >
                <div className="h-12 w-12 md:h-16 md:w-16 rounded-xl md:rounded-2xl gradient-primary flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform shadow-glow">
                  <feature.icon className="h-6 w-6 md:h-8 md:w-8 text-primary-foreground" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-2 md:mb-3">{feature.title}</h3>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Certificate Showcase Section */}
      <CertificateShowcase />

      {/* Popular Courses Section */}
      <PopularCourses />

      {/* CTA Section */}
      <section className="py-8 md:py-12 relative">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.95,
            }}
            whileInView={{
              opacity: 1,
              scale: 1,
            }}
            transition={{
              duration: 0.6,
            }}
            viewport={{
              once: true,
            }}
            className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-[hsl(200,85%,55%)] to-[hsl(210,90%,50%)] p-8 md:p-12 lg:p-16"
          >
            {/* Background floating particles */}
            <div className="absolute -top-20 -left-20 w-40 md:w-72 h-40 md:h-72 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -right-20 w-48 md:w-96 h-48 md:h-96 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/4 w-24 md:w-48 h-24 md:h-48 bg-orange-400/20 rounded-full blur-2xl" />
            <div className="absolute bottom-10 right-1/3 w-32 md:w-64 h-32 md:h-64 bg-white/5 rounded-full blur-3xl" />

            <div className="relative max-w-3xl mx-auto text-center">
              <motion.div
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.4,
                  delay: 0.1,
                }}
                viewport={{
                  once: true,
                }}
                className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-white/20 text-white text-xs md:text-sm font-medium mb-4 md:mb-6"
              >
                <Zap className="h-3 w-3 md:h-4 md:w-4" />
                Start Learning Today
              </motion.div>
              <motion.h2
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.5,
                  delay: 0.2,
                }}
                viewport={{
                  once: true,
                }}
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-white mb-4 md:mb-6 tracking-tight"
              >
                Ready to Start Your Journey?
              </motion.h2>
              <motion.p
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.5,
                  delay: 0.3,
                }}
                viewport={{
                  once: true,
                }}
                className="text-white/80 text-sm md:text-lg mb-8 md:mb-10 max-w-xl mx-auto px-2"
              >
                Join thousands of learners and start your journey today. No credit card required.
              </motion.p>
              <motion.div
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.5,
                  delay: 0.4,
                }}
                viewport={{
                  once: true,
                }}
                className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center px-4 sm:px-0"
              >
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="rounded-full text-base md:text-lg px-6 md:px-8 bg-white text-primary hover:bg-white/90 border-0 w-full sm:w-auto"
                >
                  Get Started Free
                  <ChevronRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                </Button>
                <Button
                  size="lg"
                  onClick={() => navigate("/courses")}
                  className="rounded-full text-base md:text-lg px-6 md:px-8 bg-foreground text-background hover:bg-foreground/90 border-0 w-full sm:w-auto"
                >
                  Browse Courses
                </Button>
              </motion.div>
              <motion.div
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.5,
                  delay: 0.5,
                }}
                viewport={{
                  once: true,
                }}
                className="mt-8 md:mt-10 flex flex-wrap items-center justify-center gap-4 md:gap-6 text-white/80 text-xs md:text-sm"
              >
                <span className="flex items-center gap-1.5 md:gap-2">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-white" /> Free to start
                </span>
                <span className="flex items-center gap-1.5 md:gap-2">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-white" /> No credit card
                </span>
                <span className="flex items-center gap-1.5 md:gap-2">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-white" /> Cancel anytime
                </span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 md:py-12 bg-secondary/30 border-t border-border">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
            {/* Brand Column */}
            <div className="space-y-4 sm:col-span-2 lg:col-span-1">
              <SiteLogo size="md" />
              <p className="text-muted-foreground text-sm leading-relaxed">
                Empowering learners worldwide with industry-leading courses and expert instruction.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <motion.a
                  href="#"
                  whileHover={{
                    scale: 1.1,
                  }}
                  whileTap={{
                    scale: 0.95,
                  }}
                  className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Facebook className="h-4 w-4" />
                </motion.a>
                <motion.a
                  href="#"
                  whileHover={{
                    scale: 1.1,
                  }}
                  whileTap={{
                    scale: 0.95,
                  }}
                  className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Twitter className="h-4 w-4" />
                </motion.a>
                <motion.a
                  href="#"
                  whileHover={{
                    scale: 1.1,
                  }}
                  whileTap={{
                    scale: 0.95,
                  }}
                  className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Linkedin className="h-4 w-4" />
                </motion.a>
                <motion.a
                  href="#"
                  whileHover={{
                    scale: 1.1,
                  }}
                  whileTap={{
                    scale: 0.95,
                  }}
                  className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Instagram className="h-4 w-4" />
                </motion.a>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Quick Links</h4>
              <ul className="space-y-2">
                {[
                  {
                    label: "Home",
                    href: "/",
                  },
                  {
                    label: "About Us",
                    href: "https://academy.skillzrevo.com/about-skillzrevo",
                  },
                  {
                    label: "Live Courses",
                    href: "/courses?type=live",
                  },
                  {
                    label: "Self Paced Courses",
                    href: "/courses?type=self_paced",
                  },
                  {
                    label: "Contact",
                    href: "https://academy.skillzrevo.com/contact-us",
                  },
                ].map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target={link.href.startsWith("http") ? "_blank" : undefined}
                      rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      onClick={(e) => {
                        if (link.href.startsWith("/")) {
                          e.preventDefault();
                          navigate(link.href);
                        }
                      }}
                      className="text-muted-foreground hover:text-primary transition-colors text-sm"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Courses */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Popular Courses</h4>
              <ul className="space-y-2">
                {[
                  "Generative AI",
                  "Data Science & Analytics",
                  "Business Intelligence",
                  "Cyber Security",
                  "Cloud & DevOps",
                ].map((course) => (
                  <li key={course}>
                    <button
                      onClick={() => navigate("/courses")}
                      className="text-muted-foreground hover:text-primary transition-colors text-sm text-left"
                    >
                      {course}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div className="space-y-4" id="contact">
              <h4 className="font-semibold text-foreground">Contact Us</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span>A-166, Suite no-304, 3rd Floor, A Block, Sector 63, Noida, UP 201301, India</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                  <a className="hover:text-primary transition-colors" href="mailto:enquire@skillzrevo.com">
                    enquire@skillzrevo.com
                  </a>
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 text-primary shrink-0" />
                  <a className="hover:text-primary transition-colors break-all" href="tel:+916295477674">
                    +01204934917 | +916295477674
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-10 md:mt-12 pt-6 md:pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-muted-foreground text-xs md:text-sm text-center md:text-left">
              © 2026 SkillzRevo. All rights reserved.
            </p>
            <div className="flex items-center gap-4 md:gap-6 text-xs md:text-sm text-muted-foreground">
              <a className="hover:text-primary transition-colors" href="https://academy.skillzrevo.com/PrivacyPolicy">
                Privacy Policy
              </a>
              <a
                className="hover:text-primary transition-colors"
                href="https://academy.skillzrevo.com/TermsandConditions"
              >
                Terms of Service
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors flex items-center justify-center"
            aria-label="Scroll to top"
          >
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
export default Index;
