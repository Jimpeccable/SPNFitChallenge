import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Map, Battery, Zap, Clock } from 'lucide-react';

type Challenge = { id: string, name: string, type: string, target_ep: number, is_active: boolean, config: any };
type Waypoint = { x: number, y: number, name: string, ep: number };
type Config = { ep_name: string, start_date: string };

export default function Challenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [totalPlatformEp, setTotalPlatformEp] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [globalConfig, setGlobalConfig] = useState<Config>({ ep_name: 'EP', start_date: '' });
  const [now, setNow] = useState(new Date().getTime());

  useEffect(() => {
    loadChallenges();
    const ticker = setInterval(() => setNow(new Date().getTime()), 1000);
    return () => clearInterval(ticker);
  }, []);

  async function loadChallenges() {
    const { data: cfg } = await supabase.from('settings').select('value').eq('id', 'platform_config').maybeSingle();
    if (cfg?.value) setGlobalConfig(cfg.value as any);

    const { data: chalData } = await supabase.from('challenges').select('*').eq('is_active', true);
    if (chalData) setChallenges(chalData);

    const { data: logsData } = await supabase.from('workout_logs').select('ep_earned');
    if (logsData) {
      const sum = logsData.reduce((acc, log) => acc + Number(log.ep_earned), 0);
      setTotalPlatformEp(sum);
    }
    setLoading(false);
  }

  if (loading) return <div className="container" style={{paddingTop: '4rem', textAlign: 'center'}}>Loading Matrix...</div>;

  let isLocked = false;
  let timeRemaining = 0;
  if (globalConfig.start_date) {
      const startTime = new Date(globalConfig.start_date).getTime();
      if (startTime > now) {
         isLocked = true;
         timeRemaining = startTime - now;
      }
  }

  const epTerm = globalConfig.ep_name || 'EP';

  const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeRemaining / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((timeRemaining / 1000 / 60) % 60);
  const seconds = Math.floor((timeRemaining / 1000) % 60);

  return (
    <div className="container" style={{ paddingTop: '2rem', position: 'relative' }}>
      
      {/* GLOBAL LOCKOUT OVERLAY */}
      {isLocked && (
         <div style={{ position: 'fixed', top: '70px', left: 0, width: '100vw', height: '100vh', zIndex: 1000, backdropFilter: 'blur(20px)', background: 'rgba(0,10,20,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={80} color="var(--accent-primary)" style={{ marginBottom: '2rem' }} />
            <h1 style={{ fontSize: '3rem', margin: 0, textShadow: '0 0 20px rgba(163, 255, 71, 0.5)' }}>THE CHALLENGE BEGINS IN</h1>
            <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
               <div style={{ textAlign: 'center' }}><div style={{ fontSize: '4rem', fontWeight: 'bold' }}>{days}</div><div style={{ color: 'var(--accent-primary)', letterSpacing: '4px' }}>DAYS</div></div>
               <div style={{ textAlign: 'center' }}><div style={{ fontSize: '4rem', fontWeight: 'bold' }}>{hours.toString().padStart(2, '0')}</div><div style={{ color: 'var(--accent-primary)', letterSpacing: '4px' }}>HOURS</div></div>
               <div style={{ textAlign: 'center' }}><div style={{ fontSize: '4rem', fontWeight: 'bold' }}>{minutes.toString().padStart(2, '0')}</div><div style={{ color: 'var(--accent-primary)', letterSpacing: '4px' }}>MINUTES</div></div>
               <div style={{ textAlign: 'center' }}><div style={{ fontSize: '4rem', fontWeight: 'bold' }}>{seconds.toString().padStart(2, '0')}</div><div style={{ color: 'var(--accent-primary)', letterSpacing: '4px' }}>SECONDS</div></div>
            </div>
            <p style={{ marginTop: '3rem', fontSize: '1.2rem', color: 'var(--text-muted)' }}>Global Objectives are strictly classified until deployment time.</p>
         </div>
      )}

      {/* Content wrapper subjected to blur slightly by the absolute overlay if locked */}
      <div style={{ filter: isLocked ? 'blur(15px)' : 'none', pointerEvents: isLocked ? 'none' : 'auto' }}>
        
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
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Keep the grid powered! We need {c.target_ep.toLocaleString()} total {epTerm} logged to reach maximum charge.</p>
                    
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
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>A collective visual journey spanning {c.target_ep.toLocaleString()} {epTerm} distance.</p>
                    
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
                                {wp.name} ({wp.ep} {epTerm})
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
                      <span>{progress.toFixed(1)}% ({totalPlatformEp} {epTerm} logged)</span>
                      <span>Destination ({c.target_ep} {epTerm})</span>
                    </div>
                  </div>
                );
              }

              // Fallback for new quest types currently in development
              return (
                  <div key={c.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--accent-gold)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h2 style={{ margin: 0 }}>{c.name}</h2>
                      <Map size={24} color="var(--accent-gold)" />
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Mode: {c.type.toUpperCase()}</p>
                    
                    <div style={{ height: '30px', background: 'rgba(0,0,0,0.5)', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#000', fontWeight: 'bold' }}>
                         {progress > 5 && `${progress.toFixed(1)}%`}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span>{progress.toFixed(1)}% Complete</span>
                      <span>{c.target_ep} {epTerm} Required</span>
                    </div>
                  </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
