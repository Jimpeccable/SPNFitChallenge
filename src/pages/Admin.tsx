import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Plus, Settings } from 'lucide-react';

type ActivityType = { id: string, name: string, unit_label: string, ep_per_unit: number, is_active: boolean };

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activities, setActivities] = useState<ActivityType[]>([]);
  
  // New Activity State
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newEp, setNewEp] = useState('');

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setIsAdmin(false);

      const { data } = await supabase.from('users').select('is_admin').eq('id', user.id).single();
      setIsAdmin(!!data?.is_admin);

      if (data?.is_admin) {
        loadActivities();
      }
    }
    checkAdmin();
  }, []);

  async function loadActivities() {
    const { data } = await supabase.from('activity_types').select('*').order('name');
    if (data) setActivities(data);
  }

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newUnit || !newEp) return;
    
    const { error } = await supabase.from('activity_types').insert([
      { name: newName, unit_label: newUnit, ep_per_unit: Number(newEp) }
    ]);
    
    if (!error) {
      setNewName(''); setNewUnit(''); setNewEp('');
      loadActivities();
    } else {
      alert(error.message);
    }
  };

  const toggleActivity = async (id: string, currentStatus: boolean) => {
    await supabase.from('activity_types').update({ is_active: !currentStatus }).eq('id', id);
    loadActivities();
  };

  if (isAdmin === null) return <div className="container">Checking access...</div>;
  if (isAdmin === false) return <div className="container text-gradient"><h2 style={{marginTop: '2rem'}}>Access Denied. You are not an admin.</h2><p style={{color: 'var(--text-muted)'}}>(Set your `is_admin` to TRUE in the Supabase database to view this page).</p></div>;

  return (
    <div className="container" style={{ paddingTop: '2rem' }}>
      <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <Shield size={48} color="var(--accent-alert)" style={{ margin: '0 auto 1rem' }} />
        <h1 style={{ fontSize: '3rem' }}>Admin <span className="text-gradient">Control Panel</span></h1>
      </header>

      <section className="glass-panel" style={{ marginBottom: '3rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <Settings size={24} color="var(--accent-secondary)" /> Manage Activities & EP Conversions
        </h2>
        
        <form onSubmit={handleCreateActivity} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
          <input type="text" className="glass-input" placeholder="Activity (e.g. Skiing)" value={newName} onChange={e=>setNewName(e.target.value)} required />
          <input type="text" className="glass-input" placeholder="Unit (e.g. 1 hour)" value={newUnit} onChange={e=>setNewUnit(e.target.value)} required />
          <input type="number" step="0.1" className="glass-input" placeholder="EP per unit (e.g. 5)" value={newEp} onChange={e=>setNewEp(e.target.value)} required />
          <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}><Plus size={16}/> Add Type</button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {activities.map(act => (
            <div key={act.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{act.name}</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>1x Unit ({act.unit_label}) = {act.ep_per_unit} EP</div>
              </div>
              <button 
                className="btn-primary" 
                style={{ background: act.is_active ? 'rgba(163, 255, 71, 0.2)' : 'rgba(255, 77, 106, 0.2)', border: `1px solid ${act.is_active ? 'var(--accent-secondary)' : 'var(--accent-alert)'}`, color: 'var(--text-main)', padding: '6px 16px', boxShadow: 'none' }}
                onClick={() => toggleActivity(act.id, act.is_active)}
              >
                {act.is_active ? 'Active' : 'Archived'}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-panel text-center" style={{ color: 'var(--text-muted)' }}>
        <p>Phase 2 Map Challenges and Waypoint Routing configuration will be available here.</p>
      </section>
    </div>
  );
}
