import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Activity, LogOut, BarChart3, User, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('users').select('is_admin').eq('id', user.id).single().then(({ data }) => {
          setIsAdmin(!!data?.is_admin);
        });
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <nav style={{ background: 'var(--glass-bg)', borderBottom: '1px solid var(--glass-border)', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Activity color="var(--accent-primary)" size={24} />
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontFamily: 'var(--font-display)' }}>
          Fit<span style={{color: 'var(--text-muted)'}}>Challenge</span>
        </h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
          <User size={18} /> Dashboard
        </Link>
        <Link to="/leaderboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
          <BarChart3 size={18} /> Leaderboard
        </Link>
        <Link to="/challenges" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, color: 'var(--accent-primary)' }}>
          <Activity size={18} /> Challenges
        </Link>
        {isAdmin && (
          <Link to="/admin" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, color: 'var(--accent-alert)' }}>
            <Shield size={18} /> Admin
          </Link>
        )}
        
        <button className="btn-primary" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', boxShadow: 'none', border: '1px solid var(--glass-border)', color: 'var(--text-main)', padding: '8px 16px' }}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </nav>
  );
}
