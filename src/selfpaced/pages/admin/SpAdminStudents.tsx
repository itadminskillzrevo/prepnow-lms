import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SpAdminStudents: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState('');
  useEffect(() => {
    supabase.from('selfpaced_profiles').select('*').order('created_at', { ascending: false }).limit(500)
      .then(({ data }) => setRows(data ?? []));
  }, []);
  const filtered = rows.filter(r => !q || (r.full_name || '').toLowerCase().includes(q.toLowerCase()) || (r.email || '').toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Students</h1>
      <input className="sp-input" placeholder="Search name or email..." value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 320, marginBottom: 12 }} />
      <div className="sp-card" style={{ padding: '1rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem' }}>
          <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid hsl(var(--sp-border))' }}>
            <th style={{ padding: '.5rem' }}>Name</th><th>Email</th><th>Phone</th><th>City</th><th>Joined</th>
          </tr></thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid hsl(var(--sp-border))' }}>
                <td style={{ padding: '.5rem' }}>{r.full_name || '—'}</td>
                <td>{r.email}</td><td>{r.phone || '—'}</td><td>{r.city || '—'}</td>
                <td>{new Date(r.created_at).toLocaleDateString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default SpAdminStudents;
