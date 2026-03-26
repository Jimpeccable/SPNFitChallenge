import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy } from 'lucide-react';

type LeaderboardEntry = {
  id: string;
  display_name: string;
  avatar_emoji: string | null;
  total_ep: number;
};
type LogEntry = {
  user_id: string;
  activity_type_id: string;
  logged_at: string;
  ep_earned: number;
};

export default function Leaderboard() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<LeaderboardEntry[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activities, setActivities] = useState<{id: string, name: string}[]>([]);

  // Filter State
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [filterActivity, setFilterActivity] = useState('all');

  useEffect(() => {
    async function loadLeaderboard() {
      const { data: usersData } = await supabase.from('users').select('id, display_name, avatar_emoji');
      const { data: logsData } = await supabase.from('workout_logs').select('user_id, activity_type_id, logged_at, ep_earned');
      const { data: acts } = await supabase.from('activity_types').select('id, name').eq('is_active', true);

      if (usersData && logsData) {
        setUsers(usersData.map(u => ({ ...u, avatar_emoji: u.avatar_emoji || '👤', total_ep: 0 })));
        setLogs(logsData);
      }
      if (acts) setActivities(acts);
      setLoading(false);
    }
    loadLeaderboard();
  }, []);

  const rankedLeaders = useMemo(() => {
    // 1. Filter logs
    const filteredLogs = logs.filter(log => {
      if (filterActivity !== 'all' && log.activity_type_id !== filterActivity) return false;
      const logTime = new Date(log.logged_at).getTime();
      const now = new Date().getTime();
      const daysDiff = (now - logTime) / (1000 * 3600 * 24);
      if (filterPeriod === 'week' && daysDiff > 7) return false;
      if (filterPeriod === 'month' && daysDiff > 30) return false;
      return true;
    });

    // 2. Aggregate logs per user
    const stats: Record<string, number> = {};
    users.forEach(u => stats[u.id] = 0);
    filteredLogs.forEach(log => {
      if (stats[log.user_id] !== undefined) stats[log.user_id] += Number(log.ep_earned);
    });

    // 3. Map to final list and sort
    const mapped = users.map(u => ({ ...u, total_ep: stats[u.id] }));
    return mapped.sort((a, b) => b.total_ep - a.total_ep);
  }, [users, logs, filterPeriod, filterActivity]);

  return (
    <div className="container" style={{ paddingTop: '2rem' }}>
      <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <Trophy size={48} color="var(--accent-gold)" style={{ margin: '0 auto 1rem' }} />
        <h1 style={{ fontSize: '3rem' }}>Global <span className="text-gradient">Leaderboard</span></h1>
      </header>

      {/* FILTER PANEL */}
      <section className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto 1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', padding: '12px 24px' }}>
         <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Top By:</span>
         <select className="glass-input" value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)} style={{ width: 'auto', padding: '8px' }}>
            <option value="all">All Time</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
         </select>
         <select className="glass-input" value={filterActivity} onChange={(e) => setFilterActivity(e.target.value)} style={{ width: 'auto', padding: '8px' }}>
            <option value="all">All Activities (Overall EP)</option>
            {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
         </select>
      </section>

      {loading ? (
         <div style={{ textAlign: 'center' }}>Loading rankings...</div>
      ) : (
        <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {rankedLeaders.map((leader, index) => (
              <div key={leader.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px',
                border: index === 0 ? '1px solid var(--accent-gold)' : '1px solid transparent'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', minWidth: '30px', color: index === 0 ? 'var(--accent-gold)' : index === 1 ? '#C0C0C0' : index === 2 ? '#cd7f32' : 'var(--text-muted)' }}>
                    #{index + 1}
                  </div>
                  <div style={{ fontSize: '2rem' }}>{leader.avatar_emoji}</div>
                  <div style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)', letterSpacing: '1px' }}>
                    {leader.display_name}
                  </div>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                  {leader.total_ep.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>EP</span>
                </div>
              </div>
            ))}
            {rankedLeaders.length === 0 && <p style={{ textAlign: 'center' }}>No workouts logged yet!</p>}
          </div>
        </div>
      )}
    </div>
  );
}
