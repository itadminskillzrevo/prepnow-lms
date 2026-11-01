import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, Send, X, ChevronDown } from 'lucide-react';

interface UserOption {
  user_id: string;
  full_name: string | null;
  email: string;
}

interface EmailNotificationFormProps {
  allUsers: UserOption[];
}

const MultiUserSelect: React.FC<{
  label: string;
  required?: boolean;
  users: UserOption[];
  selected: string[];
  onChange: (emails: string[]) => void;
}> = ({ label, required, users, selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const [customEmail, setCustomEmail] = useState('');

  const availableUsers = useMemo(
    () => users.filter((u) => !selected.includes(u.email)),
    [users, selected]
  );

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const addCustomEmail = () => {
    const trimmed = customEmail.trim();
    if (isValidEmail(trimmed) && !selected.includes(trimmed)) {
      onChange([...selected, trimmed]);
      setCustomEmail('');
    }
  };

  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 border rounded-md bg-background">
        {selected.map((email) => (
          <Badge key={email} variant="secondary" className="gap-1 text-xs">
            {email}
            <X
              className="h-3 w-3 cursor-pointer"
              onClick={() => onChange(selected.filter((e) => e !== email))}
            />
          </Badge>
        ))}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground"
            >
              <ChevronDown className="h-3 w-3 mr-1" />
              Add
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search or type email..." />
              <CommandList>
                <CommandEmpty>
                  <span className="text-xs text-muted-foreground">No match found. Type a full email below.</span>
                </CommandEmpty>
                <CommandGroup>
                  {availableUsers.map((user) => (
                    <CommandItem
                      key={user.user_id}
                      value={`${user.full_name || ''} ${user.email}`}
                      onSelect={() => {
                        onChange([...selected, user.email]);
                        setOpen(false);
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {user.full_name || 'No Name'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
            <div className="border-t p-2 flex gap-1.5">
              <Input
                placeholder="external@email.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomEmail();
                  }
                }}
                className="h-8 text-xs"
              />
              <Button
                size="sm"
                variant="secondary"
                className="h-8 px-3 text-xs"
                disabled={!isValidEmail(customEmail) || selected.includes(customEmail.trim())}
                onClick={addCustomEmail}
              >
                Add
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

const EmailNotificationForm: React.FC<EmailNotificationFormProps> = ({ allUsers }) => {
  const [to, setTo] = useState<string[]>([]);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (to.length === 0) {
      toast.error('"To" field mein kam se kam ek recipient hona chahiye');
      return;
    }
    if (!replyTo.trim()) {
      toast.error('"Reply-To" field required hai');
      return;
    }
    if (!body.trim()) {
      toast.error('"Body" field required hai');
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to,
          cc: cc.length > 0 ? cc : undefined,
          bcc: bcc.length > 0 ? bcc : undefined,
          replyTo,
          subject: subject || undefined,
          body,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Email successfully sent to ${to.length} recipient(s)!`);
      setTo([]);
      setCc([]);
      setBcc([]);
      setReplyTo('');
      setSubject('');
      setBody('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Send Email Notification
        </CardTitle>
        <CardDescription>
          Send email directly to selected students via SMTP
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <MultiUserSelect
          label="To"
          required
          users={allUsers}
          selected={to}
          onChange={setTo}
        />

        <MultiUserSelect
          label="Cc"
          required
          users={allUsers}
          selected={cc}
          onChange={setCc}
        />

        <MultiUserSelect
          label="Bcc (Optional)"
          users={allUsers}
          selected={bcc}
          onChange={setBcc}
        />

        <div className="space-y-2">
          <Label>
            Reply-To <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="reply-to@example.com"
            value={replyTo}
            onChange={(e) => setReplyTo(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Subject (Optional)</Label>
          <Input
            placeholder="Email subject..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>
            Body <span className="text-destructive">*</span>
          </Label>
          <Textarea
            placeholder="Write your email message..."
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>

        <Button
          className="w-full"
          onClick={handleSend}
          disabled={isSending || to.length === 0 || !replyTo.trim() || !body.trim()}
        >
          {isSending ? (
            'Sending...'
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send Email
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default EmailNotificationForm;
