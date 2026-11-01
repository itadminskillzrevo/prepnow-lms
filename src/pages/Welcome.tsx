import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const Welcome = () => {
  const navigate = useNavigate();

  const cards = [
    {
      emoji: "🎓",
      tag: "Available now",
      tagClass: "bg-muted text-muted-foreground",
      title: "College Student & Working Professional",
      description: "Industry-ready courses, certifications, and career-focused programs tailored for you.",
      cta: "Continue",
      ctaClass: "text-violet-700 dark:text-violet-400",
      iconBg: "bg-violet-50 dark:bg-violet-950",
      arrowBg: "bg-violet-50 dark:bg-violet-950",
      glowClass: "from-violet-500/10 to-transparent",
      onClick: () => navigate("/home"),
    },
    {
      emoji: "🏫",
      tag: "Available now",
      tagClass: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
      title: "School Student Courses",
      description: "Curated learning programs designed for young minds and future innovators ",
      cta: "Continue",
      ctaClass: "text-teal-700 dark:text-teal-400",
      iconBg: "bg-teal-50 dark:bg-teal-950",
      arrowBg: "bg-teal-50 dark:bg-teal-950",
      glowClass: "from-teal-500/10 to-transparent",
      onClick: () => navigate("/jr"),
    },
    {
      emoji: "🎓",
      tag: "Available now",
      tagClass: "bg-muted text-muted-foreground",
      title: "Self-Paced Courses",
      description: "Learn anytime, anywhere with flexible self-paced courses to help you upskill.",
      cta: "Continue",
      ctaClass: "text-violet-700 dark:text-violet-400",
      iconBg: "bg-violet-50 dark:bg-violet-950",
      arrowBg: "bg-violet-50 dark:bg-violet-950",
      glowClass: "from-violet-500/10 to-transparent",
      onClick: () => navigate("/selfpaced"),
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full bg-violet-400 opacity-10 blur-[80px] pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-56 h-56 rounded-full bg-teal-400 opacity-10 blur-[80px] pointer-events-none" />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-1.5 text-xs text-muted-foreground font-medium mb-6"
        >
          <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
          Learning Management System
        </motion.div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Welcome to Prepnow
          </h1>
          <p className="text-sm text-muted-foreground font-light">
            Tell us who you are — we'll personalise your learning journey.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 max-w-7xl w-full min-h-[300px]">
          {cards.map((card, idx) => (
            <motion.button
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + idx * 0.1 }}
              whileHover={{ y: -4 }}
              onClick={card.onClick}
              className="group relative overflow-hidden rounded-[18px] border border-border bg-card p-6 text-left transition-all duration-300 hover:border-border/80 hover:shadow-sm"
            >
              {/* Glow */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.glowClass} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[18px]`} />

              <div className="relative">
                {/* Icon + Tag */}
                <div className="flex items-center gap-2.5 mb-4">
                  <div className={`w-11 h-11 rounded-xl ${card.iconBg} flex items-center justify-center text-xl`}>
                    {card.emoji}
                  </div>
                  <span className={`text-[12px] font-medium uppercase tracking-widest px-2.5 py-1 rounded-full ${card.tagClass}`}>
                    {card.tag}
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-base font-medium text-foreground mb-1.5 leading-snug">
                  {card.title}
                </h2>

                {/* Description */}
                <p className="text-sm text-muted-foreground font-light leading-relaxed mb-5">
                  {card.description}
                </p>

                {/* CTA */}
                <div className={`flex items-center gap-1.5 text-sm font-medium ${card.ctaClass} group-hover:gap-3 transition-all duration-200`}>
                  <span>{card.cta}</span>
                  <span className={`w-5 h-5 rounded-full ${card.arrowBg} flex items-center justify-center text-xs group-hover:translate-x-0.5 transition-transform`}>
                    →
                  </span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-3 mt-8 w-full max-w-2xl"
        >
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            © {new Date().getFullYear()} Prepnow. All rights reserved.
          </span>
          <div className="flex-1 h-px bg-border" />
        </motion.div>

      </main>
    </div>
  );
};

export default Welcome;
