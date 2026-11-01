import React from 'react';
import { JrLayout } from '@/jr/components/JrLayout';
import { Sparkles, Target, Users, Award } from 'lucide-react';

export default function JrAbout() {
  const values = [
    { icon: Target, title: 'Our Mission', desc: 'Prepare young minds (Class 6–12) for the future with Coding, AI & creative tech education.' },
    { icon: Users, title: 'Expert Mentors', desc: 'Live sessions led by industry experts and passionate educators.' },
    { icon: Award, title: 'Real Projects', desc: 'Students build real games, apps and AI projects — not just watch videos.' },
    { icon: Sparkles, title: 'Future Ready', desc: 'AI-powered curriculum aligned with the skills tomorrow will demand.' },
  ];
  return (
    <JrLayout>
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[hsl(var(--jr-primary)/0.12)] text-[hsl(var(--jr-primary))]">About SkillzRevo Junior</span>
          <h1 className="text-4xl sm:text-5xl font-extrabold mt-4 mb-4">
            Empowering the next generation of <span className="bg-gradient-to-r from-[hsl(var(--jr-primary))] to-[hsl(var(--jr-secondary))] bg-clip-text text-transparent">creators</span>
          </h1>
          <p className="text-lg text-[hsl(var(--jr-muted))] max-w-2xl mx-auto">
            SkillzRevo Junior is a dedicated learning platform for school students (Class 6–12) to learn coding, AI, and creative technology through expert-led live classes and hands-on projects.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          {values.map((v) => {
            const Icon = v.icon;
            return (
              <div key={v.title} className="jr-card p-6">
                <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--jr-primary)/0.12)] text-[hsl(var(--jr-primary))] flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-extrabold mb-2">{v.title}</h3>
                <p className="text-[hsl(var(--jr-muted))]">{v.desc}</p>
              </div>
            );
          })}
        </div>
      </section>
    </JrLayout>
  );
}
