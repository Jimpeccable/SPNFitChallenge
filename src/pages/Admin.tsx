import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Plus, Settings, Users, Map as MapIcon, Link } from 'lucide-react';

type ActivityType = { id: string, name: string, unit_label: string, ep_per_unit: number, is_active: boolean };
type Team = { id: string, name: string };
type UserProfile = { id: string, display_name: string, email: string, team_id: string | null };
type Challenge = { id: string, name: string, type: string, target_ep: number, is_active: boolean, config: any };
type Waypoint = { x: number, y: number, name: string, ep: number };

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  
  // Data
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  // Forms
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newEp, setNewEp] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  
  const [newChalName, setNewChalName] = useState('');
  const [newChalType, setNewChalType] = useState('journey');
  const [newChalEp, setNewChalEp] = useState('');

  // Map Editor State
  const [editingMapId, setEditingMapId] = useState<string | null>(null);
  const [mapImageUrl, setMapImageUrl] = useState('');
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const mapImgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setIsAdmin(false);

      const { data } = await supabase.from('users').select('is_admin').eq('id', user.id).single();
      setIsAdmin(!!data?.is_admin);

      if (data?.is_admin) {
        loadAllData();
      }
    }
    checkAdmin();
  }, []);

  async function loadAllData() {
    const { data: act } = await supabase.from('activity_types').select('*').order('name');
    if (act) setActivities(act);
    const { data: tm } = await supabase.from('teams').select('*').order('name');
    if (tm) setTeams(tm);
    const { data: us } = await supabase.from('users').select('id, display_name, email, team_id');
    if (us) setUsersList(us);
    const { data: ch } = await supabase.from('challenges').select('*').order('created_at', { ascending: false });
    if (ch) setChallenges(ch);
  }

  /* ACT CONFIG */
  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newUnit || !newEp) return;
    const { error } = await supabase.from('activity_types').insert([{ name: newName, unit_label: newUnit, ep_per_unit: Number(newEp) }]);
    if (!error) { setNewName(''); setNewUnit(''); setNewEp(''); loadAllData(); } else alert(error.message);
  };
  const toggleActivity = async (id: string, currentStatus: boolean) => {
    await supabase.from('activity_types').update({ is_active: !currentStatus }).eq('id', id);
    loadAllData();
  };

  /* TEAMS CONFIG */
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName) return;
    const { error } = await supabase.from('teams').insert([{ name: newTeamName }]);
    if (!error) { setNewTeamName(''); loadAllData(); } else alert(error.message);
  };
  const assignUserTeam = async (userId: string, teamId: string) => {
    const { error } = await supabase.from('users').update({ team_id: teamId || null }).eq('id', userId);
    if (!error) loadAllData(); else alert(error.message);
  };

  /* CHALLENGE CONFIG */
  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChalName || !newChalType || !newChalEp) return;
    const { error } = await supabase.from('challenges').insert([{ 
      name: newChalName, type: newChalType, target_ep: Number(newChalEp), config: { imageUrl: '', waypoints: [] } 
    }]);
    if (!error) { setNewChalName(''); setNewChalEp(''); loadAllData(); } else alert(`Did you run the ALTER TABLE sql? Error: ${error.message}`);
  };
  const toggleChallenge = async (id: string, currentStatus: boolean) => {
    await supabase.from('challenges').update({ is_active: !currentStatus }).eq('id', id);
    loadAllData();
  };

  /* MAP EDITOR */
  const openMapEditor = (c: Challenge) => {
    setEditingMapId(c.id);
    setMapImageUrl(c.config?.imageUrl || '');
    setWaypoints(c.config?.waypoints || []);
  };

  const handleMapClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!mapImgRef.current) return;
    const rect = mapImgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const wpName = prompt("Enter Waypoint Name (e.g. 'Mordor Gates'):");
    if (!wpName) return;
    const wpEp = prompt(`Enter EP required to reach ${wpName}:`);
    if (!wpEp) return;

    setWaypoints([...waypoints, { x, y, name: wpName, ep: Number(wpEp) }]);
  };

  const saveMapConfig = async () => {
    if (!editingMapId) return;
    const { error } = await supabase.from('challenges')
      .update({ config: { imageUrl: mapImageUrl, waypoints } })
      .eq('id', editingMapId);
    
    if (!error) {
      setEditingMapId(null);
      loadAllData();
    } else {
      alert("Error saving map: " + error.message);
    }
  };


  if (isAdmin === null) return <div className="container">Checking access...</div>;
  if (isAdmin === false) return <div className="container text-gradient"><h2>Access Denied.</h2></div>;

  return (
    <div className="container" style={{ paddingTop: '2rem' }}>
      <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <Shield size={48} color="var(--accent-alert)" style={{ margin: '0 auto 1rem' }} />
        <h1 style={{ fontSize: '3rem' }}>Admin <span className="text-gradient">Control Panel</span></h1>
      </header>

      {editingMapId && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.9)', zIndex: 100, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
          <h2>Map Route Editor</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <input type="text" className="glass-input" placeholder="Paste Map Image URL (JPG/PNG)" value={mapImageUrl} onChange={e => setMapImageUrl(e.target.value)} />
            <button className="btn-primary" onClick={saveMapConfig}>Save Route Settings</button>
            <button className="btn-primary" style={{ background: 'transparent', border: '1px solid #fff' }} onClick={() => setEditingMapId(null)}>Cancel</button>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>Click anywhere on your map image below to drop a new Milestone target.</p>
          
          {mapImageUrl && (
            <div style={{ position: 'relative', display: 'inline-block', border: '2px solid var(--accent-primary)', cursor: 'crosshair', alignSelf: 'flex-start' }}>
              <img ref={mapImgRef} src={mapImageUrl} alt="Map" style={{ maxWidth: '1000px', display: 'block' }} onClick={handleMapClick} />
              
              {/* Render dropped waypoints */}
              {waypoints.map((wp, i) => (
                <div key={i} style={{ position: 'absolute', left: `${wp.x}%`, top: `${wp.y}%`, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 14, height: 14, background: 'var(--accent-gold)', borderRadius: '50%', border: '2px solid #000' }} />
                  <div style={{ background: 'rgba(0,0,0,0.8)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', marginTop: '4px', whiteSpace: 'nowrap' }}>
                    {wp.name} ({wp.ep} EP)
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 1. CHALLENGES */}
      <section className="glass-panel" style={{ marginBottom: '3rem', borderLeft: '4px solid var(--accent-primary)' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}><MapIcon size={24} color="var(--accent-primary)" /> Global Challenges</h2>
        <form onSubmit={handleCreateChallenge} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem', padding: '1rem', background: 'rgba(0,0,0,0.2)' }}>
          <input type="text" className="glass-input" placeholder="Challenge Name" value={newChalName} onChange={e=>setNewChalName(e.target.value)} required />
          <select className="glass-input" value={newChalType} onChange={e=>setNewChalType(e.target.value)}>
             <option value="journey">🏰 Quest (Journey Map)</option>
             <option value="battery">⚡ Power the Office</option>
             <option value="territory">🗺️ Territory War</option>
             <option value="build">🏗️ The Build-Off</option>
             <option value="bingo">🎯 Fitness Bingo</option>
             <option value="steps">👣 Step Loggers</option>
          </select>
          <input type="number" step="0.1" className="glass-input" placeholder="Target EP" value={newChalEp} onChange={e=>setNewChalEp(e.target.value)} required />
          <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}><Plus size={16}/> Create Goal</button>
        </form>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {challenges.map(c => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
              <div>
                <strong style={{fontSize: '1.2rem'}}>{c.name}</strong> <span style={{color: 'var(--text-muted)'}}>({c.type})</span> — Goal: {c.target_ep} EP
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {c.type === 'journey' && (
                  <button className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--accent-gold)', padding: '6px 16px' }} onClick={() => openMapEditor(c)}>
                    <Link size={14} style={{ marginRight: 6 }} /> Edit Map
                  </button>
                )}
                <button className="btn-primary" style={{ background: c.is_active ? 'rgba(163, 255, 71, 0.2)' : 'rgba(255, 77, 106, 0.2)', boxShadow: 'none' }} onClick={() => toggleChallenge(c.id, c.is_active)} >
                  {c.is_active ? 'Active' : 'Archived'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. TEAMS AND USERS */}
      <section className="glass-panel" style={{ marginBottom: '3rem', borderLeft: '4px solid var(--accent-secondary)' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}><Users size={24} color="var(--accent-secondary)" /> Manage Teams & Athletes</h2>
        
        {/* Teams Maker */}
        <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
            <h3 style={{marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-muted)'}}>Create Team</h3>
            <form onSubmit={handleCreateTeam} style={{ display: 'flex', gap: '1rem' }}>
              <input type="text" className="glass-input" placeholder="Team Name (e.g. Finance Legends)" value={newTeamName} onChange={e=>setNewTeamName(e.target.value)} required />
              <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}><Plus size={16}/> New Team</button>
            </form>
        </div>

        {/* User List */}
        <h3 style={{marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-muted)'}}>Assign Users to Teams</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {usersList.map(u => (
            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
              <div>
                <strong style={{fontSize: '1.2rem'}}>{u.display_name}</strong>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{u.email}</div>
              </div>
              <select className="glass-input" style={{ width: '200px' }} value={u.team_id || ''} onChange={(e) => assignUserTeam(u.id, e.target.value)}>
                <option value="">-- No Team (Solo) --</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          ))}
        </div>
      </section>

      {/* 3. ACTIVITY CONFIG */}
      <section className="glass-panel" style={{ borderLeft: '4px solid var(--accent-gold)' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}><Settings size={24} color="var(--accent-gold)" /> Effort Points Engine</h2>
        <form onSubmit={handleCreateActivity} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem', padding: '1rem', background: 'rgba(0,0,0,0.2)' }}>
          <input type="text" className="glass-input" placeholder="Activity (e.g. Skiing)" value={newName} onChange={e=>setNewName(e.target.value)} required />
          <input type="text" className="glass-input" placeholder="Unit (e.g. 1 hour)" value={newUnit} onChange={e=>setNewUnit(e.target.value)} required />
          <input type="number" step="0.1" className="glass-input" placeholder="EP per unit (e.g. 5)" value={newEp} onChange={e=>setNewEp(e.target.value)} required />
          <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}><Plus size={16}/> Add Action</button>
        </form>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {activities.map(act => (
            <div key={act.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
              <div><strong>{act.name}</strong> <span style={{ color: 'var(--text-muted)' }}>1x Unit ({act.unit_label}) = {act.ep_per_unit} EP</span></div>
              <button className="btn-primary" style={{ background: act.is_active ? 'rgba(163, 255, 71, 0.2)' : 'rgba(255, 77, 106, 0.2)', boxShadow: 'none' }} onClick={() => toggleActivity(act.id, act.is_active)} >
                {act.is_active ? 'Active' : 'Archived'}
              </button>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
