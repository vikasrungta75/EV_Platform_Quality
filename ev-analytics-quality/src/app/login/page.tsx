'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/services/authService';

const DEMO = [['quality', 'Quality department: sees everything'], ['recall', 'Recall office: approved lists only'], ['admin', 'Administrator: can view as either profile']];

export default function LoginPage() {
  const router = useRouter();
  const [username, setU] = useState('');
  const [password, setP] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(username, password);
      const r: any = await fetch('/api/auth/me', { cache: 'no-store' }).then((x) => x.json()).catch(() => null);
      router.replace(r?.role?.id === 'RCL' ? '/w/recall' : '/w/home');
    } catch (err: any) {
      setError(err.message || 'Sign-in failed');
      setBusy(false);
    }
  };
  return (
    <div className="login">
      <div className="login-logo"><img src="/ravity-logo.svg" alt="Ravity" /><span>EV Analytics Quality</span></div>
        <form className="login-card" onSubmit={submit}>
          <h2>Sign In</h2>
          {error && <div className="err" role="alert">{error}</div>}
          <label>Username<input autoFocus autoComplete="username" value={username} onChange={(e) => setU(e.target.value)} placeholder="Enter your username" /></label>
          <label>Password
            <span className="row" style={{ flexWrap: 'nowrap' }}><input style={{ flex: 1, minWidth: 0 }} type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setP(e.target.value)} /><button type="button" className="btn small" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button></span>
          </label>
          <button className="btn pri" style={{ padding: '.65rem' }} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          {process.env.NEXT_PUBLIC_SHOW_DEMO_LOGINS === '1' && (
            <div className="small muted">Demo accounts: {DEMO.map((d) => <button type="button" key={d[0]} className="btn small" style={{ margin: 2 }} title={d[1]} onClick={() => setU(d[0])}>{d[0]}</button>)}<div>Passwords are in CREDENTIALS.md.</div></div>
          )}
          <p className="small muted">Accounts are local to this deployment. They are not Ravity platform accounts.</p>
        </form>
      <p className="login-foot">Demo build with generated data. Early warning, AI root cause, predictive failure, warranty, supplier and plant quality, and risk-based recall for an EV maker.</p>
    </div>
  );
}
