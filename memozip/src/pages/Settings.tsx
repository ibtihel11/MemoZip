import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, LogOut } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useUser, useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useTheme } from '@/hooks/useTheme';
import { themes } from '@/theme/themes';
import type { Difficulty } from '@/types';
import { cn } from '@/utils/cn';
import { isValidEmail } from '@/utils/validation';

const difficultyOptions: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'mixed', label: 'Mixed' },
];
const countOptions = [5, 10, 15, 20].map((n) => ({ value: String(n), label: `${n} questions` }));

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-5">{children}</div>
    </Card>
  );
}

export default function Settings() {
  usePageTitle('Settings');
  const user = useUser();
  const { updateUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [emailError, setEmailError] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountSaved, setAccountSaved] = useState(false);
  const [prefSaved, setPrefSaved] = useState(false);

  const accountDirty = name.trim() !== user.name || email.trim() !== user.email;

  const saveAccount = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email.trim())) {
      setEmailError('Enter a valid email address, like name@school.edu.');
      return;
    }
    setEmailError('');
    setSavingAccount(true);
    await updateUser({ name: name.trim() || user.name, email: email.trim() });
    setSavingAccount(false);
    setAccountSaved(true);
    window.setTimeout(() => setAccountSaved(false), 3000);
  };

  const savePref = async (patch: Partial<{ defaultDifficulty: Difficulty; defaultQuestionCount: number }>) => {
    await updateUser(patch);
    setPrefSaved(true);
    window.setTimeout(() => setPrefSaved(false), 2500);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Settings" subtitle="Make MemoZip feel like yours." />

      <div className="space-y-5">
        <Section title="Appearance" description="Three complete palettes. The change applies instantly and is remembered on this device.">
          <fieldset>
            <legend className="sr-only">Color theme</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {themes.map((t) => {
                const active = t.name === theme;
                return (
                  <label key={t.name} className="relative block">
                    <input type="radio" name="theme" value={t.name} checked={active} onChange={() => setTheme(t.name)} className="peer sr-only" />
                    <span
                      className={cn(
                        'block cursor-pointer rounded-xl border p-3 transition',
                        'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
                        active ? 'border-accent bg-accent/10' : 'border-border hover:border-border-strong hover:bg-surface2/60',
                      )}
                    >
                      <span data-theme={t.name} aria-hidden="true" className="block rounded-lg border border-border bg-bg p-3">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-8 rounded-full bg-accent" />
                          <span className="h-2 w-5 rounded-full bg-mint" />
                          <span className="h-2 w-5 rounded-full bg-warn" />
                        </span>
                        <span className="mt-3 block h-1.5 w-3/4 rounded-full bg-fg/80" />
                        <span className="mt-1.5 block h-1.5 w-1/2 rounded-full bg-muted/60" />
                      </span>
                      <span className="mt-3 flex items-start justify-between gap-2 px-0.5">
                        <span>
                          <span className="block text-sm font-semibold">{t.label}</span>
                          <span className="block text-sm text-muted">{t.tagline}</span>
                        </span>
                        <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full border', active ? 'border-accent bg-accent text-on-accent' : 'border-border-strong')}>
                          {active && <Check size={12} strokeWidth={3} aria-hidden="true" />}
                        </span>
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </Section>

        <Section title="Account">
          <form onSubmit={saveAccount} className="space-y-4" noValidate>
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" error={emailError} />
            <div className="flex items-center gap-3">
              <Button type="submit" loading={savingAccount} disabled={!accountDirty}>Save changes</Button>
              <span role="status" className="text-sm text-mint-text">{accountSaved ? 'Saved' : ''}</span>
            </div>
          </form>
        </Section>

        <Section title="Quiz defaults" description="Used to pre-fill the quiz setup screen. You can still change them each time.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Difficulty"
              value={user.defaultDifficulty}
              options={difficultyOptions}
              onChange={(e) => void savePref({ defaultDifficulty: e.target.value as Difficulty })}
            />
            <Select
              label="Number of questions"
              value={String(user.defaultQuestionCount)}
              options={countOptions}
              onChange={(e) => void savePref({ defaultQuestionCount: Number(e.target.value) })}
            />
          </div>
          <p role="status" className="mt-3 h-5 text-sm text-mint-text">{prefSaved ? 'Preferences saved' : ''}</p>
        </Section>

        <Section title="Session">
          <Button
            variant="secondary"
            icon={<LogOut size={16} aria-hidden="true" />}
            onClick={async () => {
              await logout();
              navigate('/login', { replace: true });
            }}
          >
            Log out
          </Button>
        </Section>
      </div>
    </div>
  );
}
