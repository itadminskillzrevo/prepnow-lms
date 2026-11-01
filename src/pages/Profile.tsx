import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import {
  User, Mail, Phone, MapPin, GraduationCap, Briefcase, Globe, Building2, TrendingUp, BookOpen, CalendarDays, Lock, MoreHorizontal,
} from 'lucide-react';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileSection, ReadOnlyField } from '@/components/profile/ProfileSection';
import { PasswordSecuritySection } from '@/components/profile/PasswordSection';

const QUALIFICATIONS = ['High School', '10th', '12th', 'Diploma', "Bachelor's", "Master's", 'PhD', 'Other'];
const AREAS_OF_STUDY = ['Computer Science', 'Engineering', 'Business', 'Arts', 'Science', 'Commerce', 'Medical', 'Law', 'Other'];

const NAV_ITEMS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'experience', label: 'Experience', icon: Briefcase },
  { id: 'password', label: 'Password & Security', icon: Lock },
  { id: 'more', label: 'More', icon: MoreHorizontal },
];

const Profile: React.FC = () => {
  const { profile, role, user, refreshProfile } = useAuth();
  const [activeSection, setActiveSection] = useState('profile');
  const [editingSection, setEditingSection] = useState<string | null>(null);

  const [personalForm, setPersonalForm] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    alt_phone: (profile as any)?.alt_phone || '',
    bio: profile?.bio || '',
    gender: (profile as any)?.gender || '',
    date_of_birth: (profile as any)?.date_of_birth || '',
  });

  const [locationForm, setLocationForm] = useState({
    country: (profile as any)?.country || '',
    state: (profile as any)?.state || '',
    city: (profile as any)?.city || '',
  });

  const [educationForm, setEducationForm] = useState({
    highest_qualification: (profile as any)?.highest_qualification || '',
    area_of_study: (profile as any)?.area_of_study || '',
    year_of_completion: (profile as any)?.year_of_completion?.toString() || '',
    gpa: (profile as any)?.gpa || '',
  });

  const [experienceForm, setExperienceForm] = useState({
    years_of_experience: (profile as any)?.years_of_experience?.toString() || '',
    current_company: (profile as any)?.current_company || '',
    current_designation: (profile as any)?.current_designation || '',
  });

  // Re-sync forms when profile loads/changes (fixes "edit form not pre-filled")
  useEffect(() => {
    const p = profile as any;
    if (!p) return;
    setPersonalForm({ full_name: p.full_name || '', phone: p.phone || '', alt_phone: p.alt_phone || '', bio: p.bio || '', gender: p.gender || '', date_of_birth: p.date_of_birth || '' });
    setLocationForm({ country: p.country || '', state: p.state || '', city: p.city || '' });
    setEducationForm({ highest_qualification: p.highest_qualification || '', area_of_study: p.area_of_study || '', year_of_completion: p.year_of_completion?.toString() || '', gpa: p.gpa || '' });
    setExperienceForm({ years_of_experience: p.years_of_experience?.toString() || '', current_company: p.current_company || '', current_designation: p.current_designation || '' });
  }, [profile]);

  const resetForm = useCallback((section: string) => {
    const p = profile as any;
    if (section === 'personal') setPersonalForm({ full_name: p?.full_name || '', phone: p?.phone || '', alt_phone: p?.alt_phone || '', bio: p?.bio || '', gender: p?.gender || '', date_of_birth: p?.date_of_birth || '' });
    else if (section === 'location') setLocationForm({ country: p?.country || '', state: p?.state || '', city: p?.city || '' });
    else if (section === 'education') setEducationForm({ highest_qualification: p?.highest_qualification || '', area_of_study: p?.area_of_study || '', year_of_completion: p?.year_of_completion?.toString() || '', gpa: p?.gpa || '' });
    else if (section === 'experience') setExperienceForm({ years_of_experience: p?.years_of_experience?.toString() || '', current_company: p?.current_company || '', current_designation: p?.current_designation || '' });
    setEditingSection(null);
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const { error } = await supabase.from('profiles').update(data).eq('user_id', user?.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Profile updated!'); refreshProfile(); setEditingSection(null); },
    onError: (error: any) => toast.error(error.message || 'Failed to update'),
  });

  const handleSave = (section: string) => {
    let data: Record<string, any> = {};
    if (section === 'personal') data = { ...personalForm };
    else if (section === 'location') data = { ...locationForm };
    else if (section === 'education') data = { ...educationForm, year_of_completion: educationForm.year_of_completion ? parseInt(educationForm.year_of_completion) : null };
    else if (section === 'experience') data = { ...experienceForm, years_of_experience: experienceForm.years_of_experience ? parseInt(experienceForm.years_of_experience) : null };
    updateMutation.mutate(data);
  };

  const completionPercent = useMemo(() => {
    const p = profile as any;
    if (!p) return 0;
    const fields = [p.full_name, p.phone, p.gender, p.date_of_birth, p.country, p.state, p.city, p.highest_qualification, p.area_of_study, p.bio];
    return Math.round((fields.filter(f => f && String(f).trim() !== '').length / fields.length) * 100);
  }, [profile]);

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <ProfileSection
            title="Personal Information"
            icon={<User className="h-4.5 w-4.5" />}
            isEditing={editingSection === 'personal'}
            onEdit={() => setEditingSection('personal')}
            onCancel={() => resetForm('personal')}
            onSave={() => handleSave('personal')}
            isSaving={updateMutation.isPending}
            editForm={
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Full Name <span className="text-destructive">*</span></Label>
                    <Input placeholder="Your full name" className="h-10" value={personalForm.full_name} onChange={e => setPersonalForm({ ...personalForm, full_name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Email Address</Label>
                    <Input className="h-10 bg-muted" value={profile?.email || ''} disabled />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Phone <span className="text-destructive">*</span></Label>
                    <Input placeholder="+91 98765 43210" className="h-10" value={personalForm.phone} onChange={e => setPersonalForm({ ...personalForm, phone: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Alternative Phone</Label>
                    <Input placeholder="Optional" className="h-10" value={personalForm.alt_phone} onChange={e => setPersonalForm({ ...personalForm, alt_phone: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Gender <span className="text-destructive">*</span></Label>
                    <RadioGroup value={personalForm.gender} onValueChange={v => setPersonalForm({ ...personalForm, gender: v })} className="flex gap-4 pt-1.5">
                      {['Male', 'Female', 'Other'].map(g => (
                        <div key={g} className="flex items-center space-x-1.5">
                          <RadioGroupItem value={g.toLowerCase()} id={`g-${g}`} />
                          <Label htmlFor={`g-${g}`} className="font-normal text-sm cursor-pointer">{g}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Date of Birth</Label>
                    <Input type="date" className="h-10" value={personalForm.date_of_birth} onChange={e => setPersonalForm({ ...personalForm, date_of_birth: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Bio</Label>
                  <Textarea placeholder="Tell us about yourself..." rows={3} className="resize-none" value={personalForm.bio} onChange={e => setPersonalForm({ ...personalForm, bio: e.target.value })} />
                </div>
              </div>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <ReadOnlyField label="Full Name" value={profile?.full_name} />
              <ReadOnlyField label="Email" value={profile?.email} />
              <ReadOnlyField label="Phone" value={profile?.phone} />
              <ReadOnlyField label="Alt Phone" value={(profile as any)?.alt_phone} />
              <ReadOnlyField label="Gender" value={(profile as any)?.gender ? ((profile as any).gender as string).charAt(0).toUpperCase() + ((profile as any).gender as string).slice(1) : null} />
              <ReadOnlyField label="Date of Birth" value={(profile as any)?.date_of_birth} />
            </div>
            {profile?.bio && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground mb-1">Bio</p>
                <p className="text-sm text-foreground">{profile.bio}</p>
              </div>
            )}
          </ProfileSection>
        );

      case 'location':
        return (
          <ProfileSection
            title="Location Details"
            icon={<MapPin className="h-4.5 w-4.5" />}
            isEditing={editingSection === 'location'}
            onEdit={() => setEditingSection('location')}
            onCancel={() => resetForm('location')}
            onSave={() => handleSave('location')}
            isSaving={updateMutation.isPending}
            editForm={
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Country</Label>
                  <Input placeholder="India" className="h-10" value={locationForm.country} onChange={e => setLocationForm({ ...locationForm, country: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">State</Label>
                  <Input placeholder="Maharashtra" className="h-10" value={locationForm.state} onChange={e => setLocationForm({ ...locationForm, state: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">City</Label>
                  <Input placeholder="Mumbai" className="h-10" value={locationForm.city} onChange={e => setLocationForm({ ...locationForm, city: e.target.value })} />
                </div>
              </div>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-4">
              <ReadOnlyField label="Country" value={(profile as any)?.country} />
              <ReadOnlyField label="State" value={(profile as any)?.state} />
              <ReadOnlyField label="City" value={(profile as any)?.city} />
            </div>
          </ProfileSection>
        );

      case 'education':
        return (
          <ProfileSection
            title="Educational Background"
            icon={<GraduationCap className="h-4.5 w-4.5" />}
            isEditing={editingSection === 'education'}
            onEdit={() => setEditingSection('education')}
            onCancel={() => resetForm('education')}
            onSave={() => handleSave('education')}
            isSaving={updateMutation.isPending}
            editForm={
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Highest Qualification</Label>
                  <Select value={educationForm.highest_qualification} onValueChange={v => setEducationForm({ ...educationForm, highest_qualification: v })}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{QUALIFICATIONS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Area of Study</Label>
                  <Select value={educationForm.area_of_study} onValueChange={v => setEducationForm({ ...educationForm, area_of_study: v })}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{AREAS_OF_STUDY.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Year of Completion</Label>
                  <Input type="number" placeholder="2023" className="h-10" value={educationForm.year_of_completion} onChange={e => setEducationForm({ ...educationForm, year_of_completion: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">GPA / Percentage</Label>
                  <Input placeholder="3.5 or 85%" className="h-10" value={educationForm.gpa} onChange={e => setEducationForm({ ...educationForm, gpa: e.target.value })} />
                </div>
              </div>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <ReadOnlyField label="Highest Qualification" value={(profile as any)?.highest_qualification} />
              <ReadOnlyField label="Area of Study" value={(profile as any)?.area_of_study} />
              <ReadOnlyField label="Year of Completion" value={(profile as any)?.year_of_completion?.toString()} />
              <ReadOnlyField label="GPA / Percentage" value={(profile as any)?.gpa} />
            </div>
          </ProfileSection>
        );

      case 'experience':
        return (
          <ProfileSection
            title="Professional Experience"
            icon={<Briefcase className="h-4.5 w-4.5" />}
            isEditing={editingSection === 'experience'}
            onEdit={() => setEditingSection('experience')}
            onCancel={() => resetForm('experience')}
            onSave={() => handleSave('experience')}
            isSaving={updateMutation.isPending}
            editForm={
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Years of Experience</Label>
                    <Input type="number" placeholder="0" className="h-10" value={experienceForm.years_of_experience} onChange={e => setExperienceForm({ ...experienceForm, years_of_experience: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Current Company</Label>
                    <Input placeholder="Company name" className="h-10" value={experienceForm.current_company} onChange={e => setExperienceForm({ ...experienceForm, current_company: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Current Designation</Label>
                  <Input placeholder="Your role" className="h-10" value={experienceForm.current_designation} onChange={e => setExperienceForm({ ...experienceForm, current_designation: e.target.value })} />
                </div>
              </div>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <ReadOnlyField label="Years of Experience" value={(profile as any)?.years_of_experience?.toString()} />
              <ReadOnlyField label="Current Company" value={(profile as any)?.current_company} />
              <ReadOnlyField label="Current Designation" value={(profile as any)?.current_designation} />
            </div>
          </ProfileSection>
        );

      case 'password':
        return <PasswordSecuritySection />;

      case 'more':
        return (
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <MoreHorizontal className="h-4.5 w-4.5 text-muted-foreground" />
              <h2 className="text-base font-semibold text-foreground">More</h2>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Account ID</p>
              <p className="text-sm text-foreground font-mono">{user?.id?.slice(0, 8)}...</p>
            </div>
            <div className="mt-4 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Member Since</p>
              <p className="text-sm text-foreground">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <ProfileHeader profile={profile} role={role} completionPercent={completionPercent} onAvatarChange={refreshProfile} />
          </CardContent>
        </Card>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar Navigation */}
          <Card className="md:w-56 shrink-0">
            <CardContent className="p-2">
              <nav className="flex md:flex-col gap-0.5 overflow-x-auto md:overflow-visible">
                {NAV_ITEMS.map(item => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setActiveSection(item.id); setEditingSection(null); }}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap w-full text-left ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="hidden md:inline">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>

          {/* Content Area */}
          <Card className="flex-1 min-w-0">
            <CardContent className="p-6">
              {renderSection()}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
