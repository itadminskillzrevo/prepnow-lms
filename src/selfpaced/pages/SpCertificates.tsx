import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSpAuth } from '@/selfpaced/contexts/SpAuthContext';
import { Award } from 'lucide-react';

const SpCertificates: React.FC = () => {
  const { user } = useSpAuth();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('selfpaced_enrollments')
      .select('*, selfpaced_courses(id,title,slug,thumbnail_url)')
      .eq('user_id', user.id).not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .then(({ data }) => setRows(data ?? []));
  }, [user?.id]);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Certificates</h1>
      {rows.length === 0
        ? <div className="sp-card" style={{ padding: '2.5rem', textAlign: 'center', color: 'hsl(var(--sp-muted))' }}>
            Complete a course to earn your first certificate. <Link to="/selfpaced/my-courses" style={{ color: 'hsl(var(--sp-primary))' }}>View my courses</Link>
          </div>
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {rows.map(r => (
              <div key={r.id} className="sp-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                <Award size={40} style={{ color: 'hsl(var(--sp-accent))' }} />
                <div style={{ fontWeight: 700, marginTop: '.6rem' }}>{r.selfpaced_courses?.title}</div>
                <div style={{ fontSize: '.78rem', color: 'hsl(var(--sp-muted))', marginTop: 4 }}>Completed on {new Date(r.completed_at).toLocaleDateString('en-IN')}</div>
              </div>
            ))}
          </div>}
    </div>
  );
};
export default SpCertificates;
