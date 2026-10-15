import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthLayout } from '@/layouts/AuthLayout';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function Register() {
  usePageTitle('Create account');
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return setError('Enter your name and email to create an account.');
    if (password.length < 8) return setError('Use a password with at least 8 characters.');
    setBusy(true);
    setError(null);
    try {
      await register(name.trim(), email.trim(), password);
      navigate('/', { replace: true });
    } catch {
      setError('We couldn’t create your account. Please try again.');
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Upload a course and start studying in minutes."
      footer={<>Already have an account? <Link to="/login" className="font-medium text-accent-text hover:underline">Log in</Link></>}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input label="Name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Password" type="password" autoComplete="new-password" hint="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} error={error ?? undefined} />
        <Button type="submit" size="lg" loading={busy} className="w-full">Create account</Button>
      </form>
    </AuthLayout>
  );
}
