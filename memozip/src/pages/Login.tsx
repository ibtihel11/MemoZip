import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthLayout } from '@/layouts/AuthLayout';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function Login() {
  usePageTitle('Log in');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('ibtihel@example.com');
  const [password, setPassword] = useState('demo-password');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return setError('Enter your email and password to continue.');
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate((location.state as { from?: string } | null)?.from ?? '/', { replace: true });
    } catch {
      setError('We couldn’t log you in. Check your email and password, then try again.');
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to pick up where you left off."
      footer={<>New to MemoZip? <Link to="/register" className="font-medium text-accent-text hover:underline">Create an account</Link></>}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={error ?? undefined} />
        <Button type="submit" size="lg" loading={busy} className="w-full">Log in</Button>
      </form>
    </AuthLayout>
  );
}
