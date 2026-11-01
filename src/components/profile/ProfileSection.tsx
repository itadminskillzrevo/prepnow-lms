import React from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Save, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  editForm: React.ReactNode;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  isSaving?: boolean;
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({
  title, icon, children, editForm, isEditing, onEdit, onCancel, onSave, isSaving,
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-muted-foreground">{icon}</span>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
        </div>
        {!isEditing ? (
          <Button variant="ghost" size="sm" onClick={onEdit} className="text-primary hover:text-primary/80 h-8 px-3 text-xs">
            <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
          </Button>
        ) : (
          <div className="flex gap-1.5">
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving} className="h-8 px-3 text-xs">
              <X className="h-3.5 w-3.5 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={onSave} disabled={isSaving} className="h-8 px-3 text-xs">
              {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              Save
            </Button>
          </div>
        )}
      </div>
      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {editForm}
          </motion.div>
        ) : (
          <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ReadOnlyField: React.FC<{ label: string; value: string | null | undefined; icon?: React.ReactNode }> = ({ label, value }) => (
  <div className="space-y-1">
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
    <p className="text-sm text-foreground">{value || <span className="text-muted-foreground italic">Not provided</span>}</p>
  </div>
);
