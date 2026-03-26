import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Activity } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        if (error.message.includes('already registered')) {
          setMessage('You already have an account! Switching to Password Reset so you can generate a password for this email...');
          setMode('reset');
        } else {
          setMessage(`Error: ${error.message}`);
        }
      } else {
        setMessage('Registration successful! Check your email to verify (or just Login if you did already!).');
      }
    } else if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setMessage(`Error: ${error.message}`);
    } else if (mode === 'reset') {
      // Send magic link to reset password
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      });
      if (error) setMessage(`Error: ${error.message}`);
      else setMessage('Password reset link sent! Check your email to set a new password.');
    }
    
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div className="glass-panel" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <div style={{ marginBottom: '2rem' }}>
          <Activity size={48} color="var(--accent-primary)" style={{ margin: '0 auto 1rem' }} />
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
            <span className="text-gradient">Fit</span>Challenge
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            {mode === 'signup' ? 'Create an account to join the challenge' : mode === 'reset' ? 'Reset your password' : 'Sign in to log workouts'}
          </p>
        </div>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <input
              type="email"
              className="glass-input"
              placeholder="Email address"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {mode !== 'reset' && (
            <div>
              <input
                type="password"
                className="glass-input"
                placeholder="Password"
                value={password}
                required
                minLength={6}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}
          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Processing...' : (mode === 'signup' ? 'Sign Up' : mode === 'reset' ? 'Send Reset Link' : 'Sign In')}
          </button>
        </form>

        {message && (
          <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: message.includes('Error') ? 'var(--accent-alert)' : 'var(--accent-secondary)' }}>
            {message}
          </p>
        )}

        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          {mode !== 'signin' && (
             <button type="button" onClick={() => { setMode('signin'); setMessage(''); }} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 'bold' }}>
               Back to Sign In
             </button>
          )}
          {mode === 'signin' && (
             <>
               <button type="button" onClick={() => { setMode('signup'); setMessage(''); }} style={{ background: 'none', border: 'none', color: 'var(--accent-secondary)', cursor: 'pointer', fontWeight: 'bold' }}>
                 Don't have an account? Sign Up
               </button>
               <button type="button" onClick={() => { setMode('reset'); setMessage(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>
                 Forgot password? (Or used Magic Link before)
               </button>
             </>
          )}
        </div>
      </div>
    </div>
  );
}
