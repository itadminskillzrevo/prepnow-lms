import React from 'react';

const Placeholder: React.FC<{ title: string }> = ({ title }) => (
  <div>
    <h1 style={{ marginTop: 0 }}>{title}</h1>
    <div className="sp-card" style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--sp-muted))' }}>
      Coming soon — this section will let you create and assign {title.toLowerCase()} to self-paced courses.
    </div>
  </div>
);

export const SpAdminQuizzes: React.FC = () => <Placeholder title="Quizzes" />;
export const SpAdminAssignments: React.FC = () => <Placeholder title="Assignments" />;
