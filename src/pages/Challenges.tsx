import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Map, Battery, Zap } from 'lucide-react';

type Challenge = { id: string, name: string, type: string, target_ep: number, is_active: boolean };
type LogEntry = { ep_earned: number };

export default function Challenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [totalPlatformEp, setTotalPlatformEp] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadChallenges() {
      // Load active challenges
      const { data: chalData } = await supabase.from('challenges').select('*').eq('is_active', true);
      if (chalData) setChallenges(chalData);

      // Load all platform EP to power collective challenges
      const { data: logsData } = await supabase.from('workout_logs').select('ep_earned');
      if (logsData) {
        const sum = logsData.reduce((acc, log) => acc + Number(log.ep_earned), 0);
        setTotalPlatformEp(sum);
      }
      setLoading(false);
    }
    loadChallenges();
  }, []);

  if (loading) return <div className="container">Loading Challenges...</div>;

  return (
    <div className="container" style={{ paddingTop: '2rem' }}>
      <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <Map size={48} color="var(--accent-primary)" style={{ margin: '0 auto 1rem' }} />
        <h1 style={{ fontSize: '3rem' }}>Active <span className="text-gradient">Challenges</span></h1>
        <p style={{ color: 'var(--text-muted)' }}>Collective Office Goal Tracking</p>
      </header>

      {challenges.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          No active challenges created by the Admin yet!
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {challenges.map(c => {
            const progress = Math.min((totalPlatformEp / c.target_ep) * 100, 100);

            if (c.type === 'battery') {
              return (
                <div key={c.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--accent-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>Office Battery</h2>
                    <Battery size={24} color="var(--accent-secondary)" />
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Keep the grid powered! We need {c.target_ep.toLocaleString()} total EP logged to reach maximum charge.</p>
                  
                  {/* Battery Visualizer */}
                  <div style={{ height: '40px', background: 'rgba(0,0,0,0.5)', borderRadius: '8px', overflow: 'hidden', position: 'relative', border: '2px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ 
                      width: `${progress}%`, height: '100%', 
                      background: `linear-gradient(90deg, #FF4D6A ${progress < 20 ? '100%' : '0%'}, #FFB830 ${progress < 50 ? '100%' : '0%'}, #A3FF47 100%)`, 
                      transition: 'width 1s ease-in-out' 
                    }} />
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', textShadow: '0 0 5px rgba(0,0,0,0.8)' }}>
                      {progress.toFixed(1)}% Charged
                    </div>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Zap size={14} /> Current Status: {progress >= 100 ? 'Fully Charged 🎉' : progress < 20 ? 'Critical ⚠️' : 'Charging'}
                  </div>
                </div>
              );
            }

            if (c.type === 'journey') {
              return (
                <div key={c.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--accent-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>{c.name}</h2>
                    <Map size={24} color="var(--accent-primary)" />
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>A collective journey mapped across {c.target_ep.toLocaleString()} EP distance.</p>
                  
                  {/* Journey Visualizer */}
                  <div style={{ height: '20px', background: 'rgba(0,0,0,0.5)', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ 
                      width: `${progress}%`, height: '100%', 
                      background: 'var(--accent-primary)', 
                      transition: 'width 1s ease-in-out',
                      position: 'relative'
                    }}>
                       {/* The Pin */}
                       <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translate(50%, -50%)', width: '14px', height: '14px', background: '#fff', borderRadius: '50%', boxShadow: '0 0 10px var(--accent-primary)' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>Start</span>
                    <span>{progress.toFixed(1)}% ({totalPlatformEp} EP)</span>
                    <span>Destination ({c.target_ep} EP)</span>
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      )}
    </div>
  );
}
