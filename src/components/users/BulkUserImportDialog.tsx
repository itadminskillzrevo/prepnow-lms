import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Upload, Loader2, FileSpreadsheet, Plus, Trash2, CheckCircle2, XCircle, Download } from 'lucide-react';

interface BulkUser {
  email: string;
  password: string;
  fullName: string;
  role: string;
}

interface ImportResult {
  email: string;
  success: boolean;
  error?: string;
}

interface BulkUserImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const BulkUserImportDialog: React.FC<BulkUserImportDialogProps> = ({ open, onOpenChange, onSuccess }) => {
  const [users, setUsers] = useState<BulkUser[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [defaultRole, setDefaultRole] = useState('student');
  const [defaultPassword, setDefaultPassword] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('CSV file must have a header row and at least one data row');
        return;
      }

      const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
      const emailIdx = header.findIndex(h => h === 'email');
      const nameIdx = header.findIndex(h => h === 'name' || h === 'full_name' || h === 'fullname' || h === 'full name');
      const passwordIdx = header.findIndex(h => h === 'password');
      const roleIdx = header.findIndex(h => h === 'role');

      if (emailIdx === -1) {
        toast.error('CSV must have an "email" column');
        return;
      }

      const parsed: BulkUser[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
        const email = cols[emailIdx]?.trim();
        if (!email) continue;

        parsed.push({
          email,
          fullName: nameIdx !== -1 ? cols[nameIdx] || '' : '',
          password: passwordIdx !== -1 ? cols[passwordIdx] || defaultPassword : defaultPassword,
          role: roleIdx !== -1 ? cols[roleIdx] || defaultRole : defaultRole,
        });
      }

      if (parsed.length === 0) {
        toast.error('No valid users found in CSV');
        return;
      }

      if (parsed.length > 100) {
        toast.error('Maximum 100 users per import');
        return;
      }

      setUsers(parsed);
      setResults(null);
      toast.success(`${parsed.length} users loaded from CSV`);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addRow = () => {
    setUsers([...users, { email: '', password: defaultPassword, fullName: '', role: defaultRole }]);
  };

  const removeRow = (index: number) => {
    setUsers(users.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof BulkUser, value: string) => {
    const updated = [...users];
    updated[index] = { ...updated[index], [field]: value };
    setUsers(updated);
  };

  const handleImport = async () => {
    const validUsers = users.filter(u => u.email.trim());
    if (validUsers.length === 0) {
      toast.error('No users to import');
      return;
    }

    // Apply default password to users without one
    const usersToImport = validUsers.map(u => ({
      ...u,
      password: u.password || defaultPassword,
      role: u.role || defaultRole,
    }));

    const missingPasswords = usersToImport.filter(u => !u.password || u.password.length < 6);
    if (missingPasswords.length > 0) {
      toast.error('All users must have a password (min 6 characters). Set a default password or add individual passwords.');
      return;
    }

    setIsImporting(true);
    try {
      const response = await supabase.functions.invoke('bulk-import-users', {
        body: { users: usersToImport },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      setResults(response.data.results);
      const { success, failed } = response.data.summary;
      
      if (failed === 0) {
        toast.success(`All ${success} users imported successfully!`);
      } else {
        toast.warning(`${success} imported, ${failed} failed`);
      }

      if (success > 0) onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Bulk import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = 'email,name,password,role\njohn@example.com,John Doe,Password123,student\njane@example.com,Jane Smith,Password123,instructor';
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'bulk_users_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetDialog = () => {
    setUsers([]);
    setResults(null);
    setDefaultPassword('');
    setDefaultRole('student');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetDialog(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Import Users</DialogTitle>
          <DialogDescription>Upload a CSV file or manually add multiple users at once</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4">
          {/* Default settings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Default Password</Label>
              <Input
                type="text"
                placeholder="For users without password"
                value={defaultPassword}
                onChange={(e) => setDefaultPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Default Role</Label>
              <Select value={defaultRole} onValueChange={setDefaultRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="instructor">Instructor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Upload CSV</Label>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1" />CSV
                </Button>
                <Button variant="ghost" size="icon" title="Download Template" onClick={downloadTemplate}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
            </div>
          </div>

          {/* Users table */}
          {users.length > 0 && !results && (
            <ScrollArea className="h-[300px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell>
                        <Input className="h-8 text-xs" value={u.email} onChange={(e) => updateRow(i, 'email', e.target.value)} placeholder="email@example.com" />
                      </TableCell>
                      <TableCell>
                        <Input className="h-8 text-xs" value={u.fullName} onChange={(e) => updateRow(i, 'fullName', e.target.value)} placeholder="Full Name" />
                      </TableCell>
                      <TableCell>
                        <Input className="h-8 text-xs" value={u.password} onChange={(e) => updateRow(i, 'password', e.target.value)} placeholder={defaultPassword || 'Password'} />
                      </TableCell>
                      <TableCell>
                        <Select value={u.role} onValueChange={(v) => updateRow(i, 'role', v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="instructor">Instructor</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeRow(i)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          {/* Results */}
          {results && (
            <ScrollArea className="h-[300px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{r.email}</TableCell>
                      <TableCell>
                        {r.success ? (
                          <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" />Success</Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Failed</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.error || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          {/* Empty state */}
          {users.length === 0 && !results && (
            <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-3">
              <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground text-sm">Upload a CSV file or add users manually</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />Upload CSV
                </Button>
                <Button variant="outline" onClick={addRow}>
                  <Plus className="h-4 w-4 mr-2" />Add Manually
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 gap-2">
          {users.length > 0 && !results && (
            <Button variant="outline" onClick={addRow} className="mr-auto">
              <Plus className="h-4 w-4 mr-1" />Add Row
            </Button>
          )}
          {results && (
            <Button variant="outline" onClick={resetDialog} className="mr-auto">Import More</Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {results ? 'Close' : 'Cancel'}
          </Button>
          {!results && users.length > 0 && (
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Import {users.filter(u => u.email.trim()).length} Users
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUserImportDialog;
