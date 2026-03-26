import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Map, Battery, Zap } from 'lucide-react';

type Challenge = { id: string, name: string, type: string, target_ep: number, is_active: boolean, config: any };
type Waypoint = { x: number, y: number, name: string, ep: number };

export default function Challenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [totalPlatformEp, setTotalPlatformEp] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadChallenges() {
      const { data: chalData } = await supabase.from('challenges').select('*').eq('is_active', true);
      if (chalData) setChallenges(chalData);

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
            const rawProgress = (totalPlatformEp / c.target_ep) * 100;
            const progress = Math.min(rawProgress, 100);

            if (c.type === 'battery') {
              return (
                <div key={c.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--accent-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>{c.name}</h2>
                    <Battery size={24} color="var(--accent-secondary)" />
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Keep the grid powered! We need {c.target_ep.toLocaleString()} total EP logged to reach maximum charge.</p>
                  
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
              const waypoints: Waypoint[] = c.config?.waypoints || [];
              const hasMap = !!c.config?.imageUrl;

              // Find current position on map based on EP
              // Simple interpolation between waypoints for 2D maps
              let currentX = 0; let currentY = 50; // default 1d pin position
              
              if (hasMap && waypoints.length > 0) {
                 // Determine where we are
                 let prevWp = { x: 0, y: 100, ep: 0, name: 'Start' }; // Starts bottom left conceptually
                 let nextWp = waypoints[0];
                 
                 for (let i = 0; i < waypoints.length; i++) {
                   if (totalPlatformEp < waypoints[i].ep) {
                     nextWp = waypoints[i];
                     break;
                   }
                   prevWp = waypoints[i];
                   if (i === waypoints.length - 1) nextWp = prevWp; // Finished!
                 }

                 if (prevWp.ep === nextWp.ep) {
                   currentX = nextWp.x; currentY = nextWp.y;
                 } else {
                   const segmentProgress = Math.max(0, Math.min(1, (totalPlatformEp - prevWp.ep) / (nextWp.ep - prevWp.ep)));
                   currentX = prevWp.x + (nextWp.x - prevWp.x) * segmentProgress;
                   currentY = prevWp.y + (nextWp.y - prevWp.y) * segmentProgress;
                 }
              }

              return (
                <div key={c.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--accent-primary)', gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>{c.name}</h2>
                    <Map size={24} color="var(--accent-primary)" />
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>A collective visual journey spanning {c.target_ep.toLocaleString()} EP distance.</p>
                  
                  {hasMap ? (
                    <div style={{ position: 'relative', width: '100%', overflow: 'hidden', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.1)' }}>
                      <img src={c.config.imageUrl} alt="Map" style={{ width: '100%', display: 'block', opacity: 0.8 }} />
                      
                      {/* Waypoints */}
                      {waypoints.map((wp, i) => {
                        const reached = totalPlatformEp >= wp.ep;
                        return (
                          <div key={i} style={{ position: 'absolute', left: `${wp.x}%`, top: `${wp.y}%`, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ width: 12, height: 12, background: reached ? 'var(--accent-gold)' : 'rgba(255,255,255,0.3)', borderRadius: '50%', border: '2px solid #000' }} />
                            <div style={{ background: 'rgba(0,0,0,0.8)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', marginTop: '4px', whiteSpace: 'nowrap', color: reached ? 'var(--accent-gold)' : '#fff' }}>
                              {wp.name} ({wp.ep} EP)
                            </div>
                          </div>
                        );
                      })}

                      {/* Moving Avatar Pin! */}
                      <div style={{ position: 'absolute', left: `${currentX}%`, top: `${currentY}%`, transform: 'translate(-50%, -100%)', transition: 'all 1s ease-out', zIndex: 10 }}>
                         <div style={{ background: 'var(--accent-alert)', color: '#fff', padding: '6px', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', boxShadow: '0 4px 10px rgba(0,0,0,0.5)', cursor: 'pointer' }}>
                           🏃
                         </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ height: '20px', background: 'rgba(0,0,0,0.5)', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent-primary)', position: 'relative' }}>
                         <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translate(50%, -50%)', width: '14px', height: '14px', background: '#fff', borderRadius: '50%', boxShadow: '0 0 10px var(--accent-primary)' }} />
                      </div>
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>Start</span>
                    <span>{progress.toFixed(1)}% ({totalPlatformEp} EP logged)</span>
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
