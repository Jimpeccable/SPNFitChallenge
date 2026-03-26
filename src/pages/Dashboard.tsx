import { supabase } from '../lib/supabase';
import { Trophy, Activity, Zap, Target } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';

type ActivityType = { id: string, name: string, unit_label: string, ep_per_unit: number, icon_emoji: string };
type UserProfile = { display_name: string, team_id: string | null, id: string };
type LogEntry = { id: string, ep_earned: number, activity_type_id: string, logged_at: string, quantity: number };

export default function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Form state
  const [selectedActivity, setSelectedActivity] = useState('');
  const [quantity, setQuantity] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter State
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [filterActivity, setFilterActivity] = useState('all');

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userProfile } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (userProfile) setProfile(userProfile);

      const { data: acts } = await supabase.from('activity_types').select('*').eq('is_active', true);
      if (acts) {
        setActivities(acts);
        if (acts.length > 0) setSelectedActivity(acts[0].id);
      }

      await fetchLogs(user.id);
    }
    loadData();
  }, []);

  async function fetchLogs(userId: string) {
    const { data } = await supabase.from('workout_logs').select('id, ep_earned, activity_type_id, logged_at, quantity').eq('user_id', userId);
    if (data) setLogs(data);
  }

  const handleLogWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedActivity || !quantity || !logDate) return;

    setIsSubmitting(true);
    const act = activities.find(a => a.id === selectedActivity);
    if (!act) return;

    const ep = Number(quantity) * Number(act.ep_per_unit);

    // Make sure we convert string date to full timestamptz (or just date string works)
    const { error } = await supabase.from('workout_logs').insert([
      {
        user_id: profile.id,
        activity_type_id: selectedActivity,
        quantity: Number(quantity),
        ep_earned: ep,
        logged_at: new Date(logDate).toISOString(),
        notes: ''
      }
    ]);

    if (!error) {
      setQuantity('');
      alert(`Workout logged! Earned ${ep} EP.`);
      fetchLogs(profile.id);
    } else {
      alert(`Error logging workout: ${error.message}`);
    }
    setIsSubmitting(false);
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Activity Filter
      if (filterActivity !== 'all' && log.activity_type_id !== filterActivity) return false;
      
      // Date Filter
      const logTime = new Date(log.logged_at).getTime();
      const now = new Date().getTime();
      const daysDiff = (now - logTime) / (1000 * 3600 * 24);
      
      if (filterPeriod === 'week' && daysDiff > 7) return false;
      if (filterPeriod === 'month' && daysDiff > 30) return false;
      return true;
    });
  }, [logs, filterActivity, filterPeriod]);

  const totalEp = filteredLogs.reduce((sum, log) => sum + Number(log.ep_earned), 0);

  if (!profile) return <div className="container">Loading Dashboard...</div>;
  const currentActivityObj = activities.find(a => a.id === selectedActivity);

  return (
    <main className="container" style={{ paddingTop: '2rem' }}>
      <header style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>Overview — <span className="text-gradient">{profile.display_name}</span></h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Metrics based on applied filters</p>
      </header>

      {/* FILTER PANEL */}
      <section className="glass-panel" style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', padding: '12px 24px' }}>
         <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Filters:</span>
         <select className="glass-input" value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)} style={{ width: 'auto', padding: '8px' }}>
            <option value="all">All Time</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
         </select>
         <select className="glass-input" value={filterActivity} onChange={(e) => setFilterActivity(e.target.value)} style={{ width: 'auto', padding: '8px' }}>
            <option value="all">All Activities</option>
            {activities.map(a => <option key={a.id} value={a.id}>{a.icon_emoji} {a.name}</option>)}
         </select>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: 'var(--text-muted)' }}>Filtered EP</h3>
            <Trophy size={20} color="var(--accent-gold)" />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'var(--font-display)' }}>
            {totalEp.toLocaleString()} <span style={{fontSize: '1rem', color: 'var(--text-muted)'}}>EP</span>
          </div>
        </div>

        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: 'var(--text-muted)' }}>Filtered Workouts</h3>
            <Zap size={20} color="var(--accent-secondary)" />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'var(--font-display)' }}>
            {filteredLogs.length} <span style={{fontSize: '1rem', color: 'var(--text-muted)'}}>Logs</span>
          </div>
        </div>

        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: 'var(--text-muted)' }}>Team Affiliation</h3>
            <Target size={20} color="var(--accent-primary)" />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'var(--font-display)', color: profile.team_id ? '#fff' : 'var(--text-muted)' }}>
             {profile.team_id ? "Assigned" : "Solo"}
          </div>
        </div>
      </section>

      <section className="glass-panel" style={{ marginBottom: '3rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={24} color="var(--accent-primary)" /> Log A New Activity</h2>
        <form onSubmit={handleLogWorkout} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Date Achieved</label>
            <input 
              type="date" 
              className="glass-input" 
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              required 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Activity Type</label>
            <select 
              className="glass-input" 
              style={{ appearance: 'none', background: 'rgba(0,0,0,0.3)', cursor: 'pointer' }}
              value={selectedActivity}
              onChange={(e) => setSelectedActivity(e.target.value)}
              required
            >
              {activities.map(act => (
                <option key={act.id} value={act.id} style={{ color: '#000' }}>
                  {act.icon_emoji} {act.name} ({act.unit_label})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Quantity {currentActivityObj && `(in ${currentActivityObj.unit_label.split(' ')[1] || 'units'})`}
            </label>
            <input 
              type="number" 
              className="glass-input" 
              placeholder="e.g. 5000" 
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="0.1"
              step="0.1"
              required 
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Drop Log'}
            </button>
            {currentActivityObj && quantity && (
              <div style={{ paddingBottom: '12px', fontSize: '0.9rem', color: 'var(--accent-secondary)', whiteSpace: 'nowrap' }}>
                +{(Number(quantity) * Number(currentActivityObj.ep_per_unit)).toFixed(1)} EP
              </div>
            )}
          </div>
        </form>
      </section>

    </main>
  );
}
