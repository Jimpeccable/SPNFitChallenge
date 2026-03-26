import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Activity, Flame, Plus, Trophy, Zap, Map as MapIcon, Users as UsersIcon, Heart, Clock } from 'lucide-react';

type WorkoutLog = { id: string, activity_type_id: string, quantity: number, ep_earned: number, logged_at: string, activity_types: { name: string, unit_label: string } };
type ActivityType = { id: string, name: string, unit_label: string, ep_per_unit: number };
type Config = { ep_name: string, start_date: string };

export default function Dashboard() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [totalEP, setTotalEP] = useState(0);
  const [weekEP, setWeekEP] = useState(0);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [typeId, setTypeId] = useState('');
  const [qty, setQty] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Phase 3 & 4 States
  const [journey, setJourney] = useState<any>(null);
  const [allPlatformLogs, setAllPlatformLogs] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [globalConfig, setGlobalConfig] = useState<Config>({ ep_name: 'EP', start_date: '' });
  
  const [now, setNow] = useState(new Date().getTime());

  const THEMATIC_QUOTES = [
    "The wind carries whispers of distant lands. Keep pushing forward.",
    "The ground beneath your boots is hard, but your resolve is harder.",
    "Every step echoes with the legacy of those who walked before you.",
    "A strange structure hums with energy nearby. You are making monumental progress.",
    "The air is electric. Your team's momentum is unstoppable.",
    "Dark clouds part, revealing a glimmer of your ultimate destination.",
    "You smell ancient pine and petrichor. The journey stretches onward."
  ];

  useEffect(() => {
    loadData();
    const ticker = setInterval(() => setNow(new Date().getTime()), 1000);
    return () => clearInterval(ticker);
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load user profile
    const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
    setCurrentUser(profile);

    // Load Master Settings
    const { data: cfg } = await supabase.from('settings').select('value').eq('id', 'platform_config').maybeSingle();
    if (cfg?.value) setGlobalConfig(cfg.value as any);

    // Load logs for current user feed
    const { data: logsData } = await supabase
      .from('workout_logs')
      .select('id, activity_type_id, quantity, ep_earned, logged_at, activity_types(name, unit_label)')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })
      .limit(50);
    
    if (logsData) {
      setLogs(logsData as any);
      const userTotal = logsData.reduce((acc, log) => acc + Number(log.ep_earned), 0);
      setTotalEP(userTotal);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weekLogs = logsData.filter(log => new Date(log.logged_at) > oneWeekAgo);
      setWeekEP(weekLogs.reduce((acc, log) => acc + Number(log.ep_earned), 0));
    }

    // Load activities
    const { data: actData } = await supabase.from('activity_types').select('*').eq('is_active', true);
    if (actData) {
      setActivities(actData);
      if (actData.length > 0) setTypeId(actData[0].id);
    }

    // Load Journey Challenge
    const { data: cData } = await supabase.from('challenges').select('*').eq('is_active', true).eq('type', 'journey').limit(1);
    if (cData && cData.length > 0) setJourney(cData[0]);

    // Load Platform EP securely for all users to calculate team scores
    const { data: pLog } = await supabase.from('workout_logs').select('ep_earned, user_id');
    if (pLog) setAllPlatformLogs(pLog);

    // Load Teams and Users
    const { data: tData } = await supabase.from('teams').select('*').order('name');
    if (tData) setTeams(tData);

    const { data: uData } = await supabase.from('users').select('*').order('display_name');
    if (uData) setAllUsers(uData);

    setLoading(false);
  }

  const handleLogWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeId || !qty || !date) return;
    setSubmitting(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    const act = activities.find(a => a.id === typeId);
    if (!user || !act) return;

    const ep = Number(qty) * act.ep_per_unit;
    const { error } = await supabase.from('workout_logs').insert([{
      user_id: user.id,
      activity_type_id: typeId,
      quantity: Number(qty),
      ep_earned: ep,
      logged_at: new Date(date).toISOString()
    }]);

    if (!error) {
      setQty('');
      loadData();
    } else {
      alert(error.message);
    }
    setSubmitting(false);
  };

  const handleInspire = (targetUserId: string, targetName: string) => {
    const key = `inspiration_${targetUserId}`;
    const lastSentStr = localStorage.getItem(key);
    
    if (lastSentStr) {
       const lastSent = new Date(lastSentStr);
       const oneWeekAgo = new Date();
       oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
       if (lastSent > oneWeekAgo) {
          alert(`You can only inspire ${targetName} once per week! Let them catch their breath.`);
          return;
       }
    }
    
    localStorage.setItem(key, new Date().toISOString());
    alert(`⚡ You sent a burst of Inspiration to ${targetName}! They will feel the boost.`);
  };

  if (loading) return <div className="container" style={{paddingTop: '4rem', textAlign: 'center'}}>Loading Matrix...</div>;

  // Determine Pre-Start Lockout (Admin bypass removed so you can see it working!)
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

  // Compute Platform Log Collations per Team
  const teamScores: Record<string, number> = {};
  teams.forEach(t => teamScores[t.id] = 0);
  
  let myPlatformScore = totalEP; // Default to solo score if no team is assigned

  allPlatformLogs.forEach(log => {
      const logUser = allUsers.find(u => u.id === log.user_id);
      if (logUser && logUser.team_id) {
         teamScores[logUser.team_id] = (teamScores[logUser.team_id] || 0) + Number(log.ep_earned);
      }
  });

  // If the user has a team, the Journey Map tracks their Team's total progress. Otherwise, it tracks their Solo progress.
  if (currentUser?.team_id) {
     myPlatformScore = teamScores[currentUser.team_id] || 0;
  }

  // Compute Letterbox Map Stats using 'myPlatformScore' instead of the global office sum
  let prevWp = { x: 0, y: 50, ep: 0, name: 'Start' };
  let nextWp = { x: 100, y: 50, ep: 100, name: 'End' };
  let currentX = 0;
  let quoteIndex = 0;
  
  if (journey?.config?.waypoints?.length > 0) {
     const waypoints = journey.config.waypoints;
     nextWp = waypoints[0];
     for (let i = 0; i < waypoints.length; i++) {
        if (myPlatformScore < waypoints[i].ep) {
          nextWp = waypoints[i];
          break;
        }
        prevWp = waypoints[i];
        if (i === waypoints.length - 1) nextWp = prevWp;
     }

     if (prevWp.ep !== nextWp.ep) {
        const segObj = (myPlatformScore - prevWp.ep) / (nextWp.ep - prevWp.ep);
        currentX = prevWp.x + (nextWp.x - prevWp.x) * Math.max(0, Math.min(1, segObj));
     } else {
        currentX = nextWp.x;
     }
     
     quoteIndex = (waypoints.findIndex((w: any) => w.name === prevWp.name) + 1) % THEMATIC_QUOTES.length;
  }

  // Format Time Remaining
  const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeRemaining / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((timeRemaining / 1000 / 60) % 60);
  const seconds = Math.floor((timeRemaining / 1000) % 60);

  return (
    <div className="container" style={{ paddingBottom: '4rem', position: 'relative' }}>
      
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
            <p style={{ marginTop: '3rem', fontSize: '1.2rem', color: 'var(--text-muted)' }}>The map and logs are strictly classified until deployment time (GMT).</p>
         </div>
      )}

      {/* Content wrapper subjected to blur slightly by the absolute overlay if locked */}
      <div style={{ filter: isLocked ? 'blur(15px)' : 'none', pointerEvents: isLocked ? 'none' : 'auto' }}>
          
          {/* 0. Letterbox Map Overlay */}
          {journey && journey.config.imageUrl && (
            <div style={{ marginBottom: '2rem', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--accent-primary)', position: 'relative', height: '220px', background: '#000' }}>
                <div style={{ position: 'absolute', width: '200%', height: '100%', left: `-${Math.max(0, currentX - 25)}%`, transition: 'left 2s ease' }}>
                    <img src={journey.config.imageUrl} alt="Journey Map" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
                    
                    {/* Pins */}
                    {journey.config.waypoints.map((wp: any, i: number) => {
                        const reached = myPlatformScore >= wp.ep;
                        return (
                          <div key={i} style={{ position: 'absolute', left: `${wp.x}%`, top: `${wp.y}%`, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ width: 14, height: 14, background: reached ? 'var(--accent-gold)' : 'rgba(255,255,255,0.3)', borderRadius: '50%', border: '2px solid #000' }} />
                            <div style={{ background: 'rgba(0,0,0,0.8)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', marginTop: '4px', whiteSpace: 'nowrap', color: reached ? 'var(--accent-gold)' : '#fff' }}>
                              {wp.name} ({wp.ep} {epTerm})
                            </div>
                          </div>
                        )
                    })}

                    {/* Avatar Pin */}
                    <div style={{ position: 'absolute', left: `${currentX}%`, top: `50%`, transform: 'translate(-50%, -50%)', transition: 'all 1s ease-out', zIndex: 10 }}>
                      <div style={{ background: 'var(--accent-alert)', color: '#fff', padding: '6px', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', boxShadow: '0 0 15px var(--accent-alert)' }}>
                        🏃
                      </div>
                    </div>
                </div>

                {/* Letterbox UI Overlays */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.9), transparent)', padding: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}><MapIcon size={18} color="var(--accent-primary)"/> {journey.name}</h3>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{currentUser?.team_id ? 'Team' : 'Solo'} Progress: {myPlatformScore.toLocaleString()} / {journey.target_ep.toLocaleString()} {epTerm} logged!</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.9rem', color: 'var(--accent-gold)' }}>Next Checkpoint: <strong>{nextWp.name}</strong></div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{Math.max(0, nextWp.ep - myPlatformScore).toFixed(1)} {epTerm} remaining</div>
                  </div>
                </div>

                <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', right: '1rem', textAlign: 'center', fontStyle: 'italic', fontSize: '0.95rem', color: 'var(--text-muted)', textShadow: '0 1px 3px #000' }}>
                  "{THEMATIC_QUOTES[quoteIndex]}"
                </div>
            </div>
          )}

          {/* 1. Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
            <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(163, 255, 71, 0.1)', padding: '1rem', borderRadius: '12px' }}>
                <Activity size={24} color="var(--accent-primary)" />
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Lifetime {epTerm}</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 600 }}>{totalEP.toFixed(1)}</div>
              </div>
            </div>
            <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(255, 77, 106, 0.1)', padding: '1rem', borderRadius: '12px' }}>
                <Flame size={24} color="var(--accent-alert)" />
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>This Week</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 600 }}>{weekEP.toFixed(1)}</div>
              </div>
            </div>
            <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(255, 184, 48, 0.1)', padding: '1rem', borderRadius: '12px' }}>
                <Trophy size={24} color="var(--accent-gold)" />
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Events Logged</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 600 }}>{logs.length}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
            
            {/* Left Column: Log Entry + Teams Viewer */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              <div className="glass-panel">
                <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Zap size={20} color="var(--accent-primary)" /> Log Activity
                </h2>
                <form onSubmit={handleLogWorkout} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Date</label>
                    <input type="date" className="glass-input" value={date} onChange={e=>setDate(e.target.value)} required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Activity</label>
                      <select className="glass-input" value={typeId} onChange={(e) => setTypeId(e.target.value)} required>
                        {activities.map(a => <option key={a.id} value={a.id}>{a.name} ({a.unit_label})</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Quantity</label>
                      <input type="number" step="0.1" min="0" className="glass-input" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. 5" required />
                    </div>
                  </div>
                  <button type="submit" className="btn-primary" disabled={submitting} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                    <Plus size={18} /> {submitting ? 'Converting...' : `Generate ${epTerm}`}
                  </button>
                </form>
              </div>

              <div className="glass-panel">
                <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <UsersIcon size={20} color="var(--accent-secondary)" /> Athletes Directory
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {teams.map(team => {
                    const members = allUsers.filter(u => u.team_id === team.id);
                    if (members.length === 0) return null;
                    const thisTeamScore = teamScores[team.id] || 0;
                    
                    return (
                      <div key={team.id} style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                           <h3 style={{ margin: 0, color: 'var(--accent-secondary)' }}>{team.name}</h3>
                           <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>{thisTeamScore.toFixed(1)} {epTerm}</span>
                        </div>
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                          {members.map(m => (
                              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                                <span style={{ fontWeight: m.id === currentUser?.id ? 'bold' : 'normal', color: m.id === currentUser?.id ? 'var(--accent-primary)' : '#fff' }}>
                                  {m.display_name} {m.id === currentUser?.id && '(You)'}
                                </span>
                                {m.id !== currentUser?.id && (
                                  <button onClick={() => handleInspire(m.id, m.display_name)} title="Send Weekly Inspiration!" style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '50%' }}>
                                    <Heart size={16} color="var(--accent-alert)" />
                                  </button>
                                )}
                              </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* Solo Athletes */}
                  {(() => {
                    const solo = allUsers.filter(u => !u.team_id);
                    if (solo.length === 0) return null;
                    return (
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)' }}>Solo Runners</h3>
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                          {solo.map(m => (
                              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                                <span style={{ fontWeight: m.id === currentUser?.id ? 'bold' : 'normal', color: m.id === currentUser?.id ? 'var(--accent-primary)' : '#fff' }}>
                                  {m.display_name} {m.id === currentUser?.id && '(You)'}
                                </span>
                                {m.id !== currentUser?.id && (
                                  <button onClick={() => handleInspire(m.id, m.display_name)} title="Send Weekly Inspiration!" style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '50%' }}>
                                    <Heart size={16} color="var(--accent-alert)" />
                                  </button>
                                )}
                              </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>

            </div>

            {/* Right Column: Recent Activity Feed */}
            <div className="glass-panel">
              <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={20} color="var(--accent-secondary)" /> Recent Activity
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {logs.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No logs yet. Start burning!</p>
                ) : (
                  logs.map(log => (
                    <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px' }}>
                      <div>
                        <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{log.activity_types.name}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {log.quantity} {log.activity_types.unit_label}{' '}
                          • {new Date(log.logged_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ background: 'rgba(163, 255, 71, 0.1)', color: 'var(--accent-primary)', padding: '0.5rem 1rem', borderRadius: '20px', fontWeight: 600 }}>
                        +{log.ep_earned.toFixed(1)} {epTerm}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
      
      </div>

    </div>
  );
}
