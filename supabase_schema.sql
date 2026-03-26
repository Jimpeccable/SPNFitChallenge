-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Teams Table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  colour_hex TEXT,
  icon_emoji TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Users Table (Extends Supabase Auth Auth.users)
CREATE TABLE users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT,
  avatar_emoji TEXT,
  colour_hex TEXT,
  is_admin BOOLEAN DEFAULT false,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Activity Types Config Table
CREATE TABLE activity_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  unit_label TEXT NOT NULL,
  ep_per_unit NUMERIC(10,2) NOT NULL,
  icon_emoji TEXT,
  material_category TEXT,
  is_active BOOLEAN DEFAULT true,
  description TEXT
);

-- 4. Workout Logs
CREATE TABLE workout_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  activity_type_id UUID REFERENCES activity_types(id) ON DELETE RESTRICT,
  quantity NUMERIC(10,2) NOT NULL,
  ep_earned NUMERIC(10,2) NOT NULL,
  notes TEXT,
  logged_at TIMESTAMPTZ DEFAULT now(),
  challenge_id UUID -- Placeholder for later challenge linkage
);

-- 4b. Challenges Config
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'journey' or 'battery'
  target_ep NUMERIC(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Default Config Items (Optional, like global Teams Webhook or Grace Period)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB
);

-- Insert Default Activities (from PRD)
INSERT INTO activity_types (name, unit_label, ep_per_unit, icon_emoji, description) VALUES
('Walking', '1,000 steps', 5, '🚶', 'Base unit'),
('Running', '1,000 steps', 6, '🏃', 'Slightly higher intensity'),
('Cycling (outdoor)', '1 mile', 2, '🚴', '~3 miles ≈ 2,000 steps'),
('Cycling (static)', '15 mins', 8, '🚲', 'Peloton/Indoor bike'),
('Gym session', '15 mins', 7, '🏋️', 'Strength training'),
('HIIT / Circuit', '15 mins', 9, '🔥', 'High intensity interval training'),
('Yoga / Pilates', '15 mins', 5, '🧘', 'Flexibility and core'),
('Swimming', '15 mins', 8, '🏊', 'Pool session'),
('Rowing (machine)', '15 mins', 9, '🛶', 'Rowing ergometer'),
('Other', '15 mins', 5, '⏱️', 'Catch-all for missing activities');

-- Row Level Security (RLS) policies

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Basic Policies (allowing simple public read for authenticated, and own insert/update)
CREATE POLICY "Allow public read on teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Allow public read on users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow users to update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow public read on activity_types" ON activity_types FOR SELECT USING (true);
CREATE POLICY "Allow public read on workout_logs" ON workout_logs FOR SELECT USING (true);
CREATE POLICY "Allow users to insert own workout_log" ON workout_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to update own workout_log within 24 hours" ON workout_logs FOR UPDATE USING (auth.uid() = user_id AND logged_at > now() - interval '24 hours');
CREATE POLICY "Allow users to delete own workout_log within 24 hours" ON workout_logs FOR DELETE USING (auth.uid() = user_id AND logged_at > now() - interval '24 hours');

-- ADMIN Policies (so the admin panel works fully)
-- These allow anyone whose 'is_admin' boolean is true to update/insert global configurations and team assignments
CREATE POLICY "Admins can insert teams" ON teams FOR INSERT WITH CHECK ((SELECT is_admin FROM users WHERE id = auth.uid()) = true);
CREATE POLICY "Admins can update teams" ON teams FOR UPDATE USING ((SELECT is_admin FROM users WHERE id = auth.uid()) = true);

CREATE POLICY "Admins can update other users" ON users FOR UPDATE USING ((SELECT is_admin FROM users WHERE id = auth.uid()) = true);

CREATE POLICY "Admins can insert activity" ON activity_types FOR INSERT WITH CHECK ((SELECT is_admin FROM users WHERE id = auth.uid()) = true);
CREATE POLICY "Admins can update activity" ON activity_types FOR UPDATE USING ((SELECT is_admin FROM users WHERE id = auth.uid()) = true);

CREATE POLICY "Admins can insert challenges" ON challenges FOR INSERT WITH CHECK ((SELECT is_admin FROM users WHERE id = auth.uid()) = true);
CREATE POLICY "Admins can update challenges" ON challenges FOR UPDATE USING ((SELECT is_admin FROM users WHERE id = auth.uid()) = true);

-- Function to handle new user creation from Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, display_name, email)
  values (new.id, split_part(new.email, '@', 1), new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
