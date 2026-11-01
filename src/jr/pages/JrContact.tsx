import React, { useState } from 'react';
import { JrLayout } from '@/jr/components/JrLayout';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function JrContact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simple front-end submission acknowledgement (no backend wiring requested)
    await new Promise((r) => setTimeout(r, 600));
    toast.success("Thanks! We'll get back to you soon.");
    setForm({ name: '', email: '', message: '' });
    setLoading(false);
  };

  return (
    <JrLayout>
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[hsl(var(--jr-secondary)/0.15)] text-[hsl(var(--jr-secondary))]">Contact Us</span>
          <h1 className="text-4xl sm:text-5xl font-extrabold mt-4">We'd love to hear from you</h1>
          <p className="text-lg text-[hsl(var(--jr-muted))] mt-3">Questions about courses, batches, or scholarships? Reach out anytime.</p>
        </div>

        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
          <div className="space-y-4">
            {[
              { icon: Mail, label: 'Email', value: 'support@skillzrevo.com' },
              { icon: Phone, label: 'Phone', value: '+91 90000 00000' },
              { icon: MapPin, label: 'Location', value: 'India • Online Live Classes' },
            ].map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="jr-card p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--jr-primary)/0.12)] text-[hsl(var(--jr-primary))] flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-[hsl(var(--jr-muted))] font-bold">{c.label}</div>
                    <div className="font-semibold">{c.value}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={submit} className="jr-card p-6 space-y-4">
            <div>
              <label className="text-sm font-bold mb-1 block">Your Name</label>
              <input className="jr-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Aarav Sharma" />
            </div>
            <div>
              <label className="text-sm font-bold mb-1 block">Email</label>
              <input className="jr-input" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
            </div>
            <div>
              <label className="text-sm font-bold mb-1 block">Message</label>
              <textarea className="jr-input min-h-32" required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us how we can help…" />
            </div>
            <button className="jr-btn w-full" disabled={loading}>
              <Send className="w-4 h-4" /> {loading ? 'Sending…' : 'Send Message'}
            </button>
          </form>
        </div>
      </section>
    </JrLayout>
  );
}
