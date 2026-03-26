# FitChallenge — Product Requirements Document
**Version:** 1.0  
**Author:** James Coupe  
**Status:** Draft  
**Platform Target:** GitHub Pages (static hosting) + Supabase (free tier persistent backend)

---

## 1. Overview

FitChallenge is a self-hosted, browser-based fitness competition platform designed for internal workplace use. It enables colleagues to register, log workouts, compete individually or in teams, and track collective progress across multiple challenge formats — all from a single, highly polished web application deployed on GitHub Pages.

The application targets a Peloton-inspired Apple Glassmorphism aesthetic: dark deep-space backgrounds, frosted glass cards, vivid neon accent gradients (cyan/electric blue/lime), bold typography, and subtle motion throughout.

---

## 2. Goals

| # | Goal |
|---|------|
| G1 | Zero cost to host — GitHub Pages frontend, Supabase free tier backend |
| G2 | No developer knowledge required for day-to-day admin |
| G3 | All activity conversions fully editable by an admin |
| G4 | Support all five challenge formats from the brief simultaneously |
| G5 | Full team support with custom naming, rosters, and team stats |
| G6 | Persistent data across sessions and devices |
| G7 | Leaderboards, personal stats, and challenge-wide analytics |
| G8 | Map-based journey challenges with uploadable map images and route plotting |
| G9 | Professional, premium aesthetic — Peloton/Apple glassmorphism |

---

## 3. Users & Roles

| Role | Description |
|------|-------------|
| **Admin** | Full access. Manages participants, teams, challenges, conversions, and settings. Can edit anything. Protected by a simple PIN or password. |
| **Participant** | Registers themselves (or is pre-registered). Logs workouts. Views own stats and team standing. Cannot edit global settings. |
| **Viewer** | Read-only access to leaderboard and progress. No login required. (Share a public leaderboard link.) |

---

## 4. Technical Architecture

### 4.1 Hosting
- **Frontend:** GitHub Pages, deployed from a `/docs` folder or `gh-pages` branch.
- **Stack:** Vanilla HTML/CSS/JS (single-page application, no build step required) OR React (Create React App / Vite with static export). Vanilla recommended for zero-build simplicity.
- **No server required.** All backend work handled by Supabase.

### 4.2 Backend & Persistence
- **Database:** Supabase (PostgreSQL, free tier — 500MB, sufficient for thousands of workout logs).
- **Auth:** Supabase Auth (email/magic link for participants; admin protected by a separate admin key or row-level security).
- **Storage:** Supabase Storage (for custom map image uploads).
- **Realtime:** Optional Supabase Realtime subscriptions for live leaderboard refresh.

### 4.3 Alternatives (if Supabase is unavailable)
- **Firebase Firestore** (Google, free tier): Drop-in replacement with minor SDK changes.
- **Airtable API**: Admin-friendly but rate-limited.
- **Google Sheets + Apps Script API**: Familiar, but slower and less reliable at scale.

> **Recommended:** Supabase. Free, open-source, PostgreSQL-backed, and has a clean JS client library.

---

## 5. Core Feature Modules

### 5.1 Registration & Profiles

- Self-registration form: name, email (optional), display name, profile colour/avatar (emoji picker or colour selector).
- Admin can pre-register users via a CSV import (name, email, team).
- Participants are assigned to a team at registration or by an admin post-registration.
- Profile page: shows personal stats, badges earned, workout history, team affiliation.
- Admin can edit any profile field at any time.

**Data fields:**
```
users: id, display_name, email, avatar_emoji, colour_hex, team_id, registered_at, is_admin
```

---

### 5.2 Team Management

- Admin creates teams with custom names and optional team colours/icons.
- Teams can be edited, renamed, merged, or dissolved at any time by admin.
- Participants can be moved between teams by admin.
- Team leaderboard separate from individual leaderboard.
- Team stats: total points, average points per member, most active member, streak.

**Data fields:**
```
teams: id, name, colour_hex, icon_emoji, created_at
team_members: user_id, team_id, joined_at
```

---

### 5.3 Activity & Conversion Engine *(fully editable by admin)*

This is the core fairness mechanism. All activities are normalised into **Effort Points (EP)**.

Admin can define, edit, and delete any activity type via an in-app **Activity Config Panel**. No code editing required.

**Default activity table (fully editable):**

| Activity | Unit | EP per Unit | Notes |
|----------|------|-------------|-------|
| Walking | 1,000 steps | 5 EP | Base unit |
| Running | 1,000 steps | 6 EP | Slightly higher intensity |
| Cycling (outdoor) | 1 mile | 2 EP | ~3 miles ≈ 2,000 steps |
| Cycling (static/Peloton) | 15 mins | 8 EP | |
| Gym session | 15 mins | 7 EP | |
| HIIT / Circuit | 15 mins | 9 EP | |
| Yoga / Pilates | 15 mins | 5 EP | |
| Swimming | 15 mins | 8 EP | |
| Rowing (machine) | 15 mins | 9 EP | |
| Other | 15 mins | 5 EP | Catch-all |

**Admin controls per activity:**
- Name (free text)
- Unit type: `steps`, `miles`, `km`, `minutes`, `sessions`
- EP conversion rate (decimal allowed)
- Icon (emoji picker)
- Active/inactive toggle
- Description/helper text for participants

**Data fields:**
```
activity_types: id, name, unit_label, ep_per_unit, icon_emoji, is_active, description
workout_logs: id, user_id, activity_type_id, quantity, ep_earned, logged_at, notes, challenge_id
```

---

### 5.4 Challenge Formats

The app supports all five challenge types simultaneously or individually. Admin creates and manages challenges. Each challenge can be active or archived.

---

#### Challenge Type A — Journey / Quest (Mordor / Race Across the Realm)

A collective or competitive journey across a linear distance.

**Features:**
- Admin sets a total target distance (e.g. 2,500 miles or converted EP equivalent).
- Admin uploads a custom map image (JPG/PNG).
- Admin plots a route on the map using a click-to-add waypoint tool (stored as percentage-based coordinates on the image).
- Each waypoint has a name, flavour text, and optionally a milestone reward/badge.
- As total EP accumulates, a journey marker (avatar pin) advances along the plotted route.
- Supports: individual race, team race, or collective (whole office) mode.
- Progress shown as an animated pin on the map, % complete, and distance remaining.

**Admin controls:**
- Upload map image.
- Add/edit/delete waypoints by clicking on the uploaded map.
- Set start and end point labels.
- Set total EP target.
- Set mode: individual / team / collective.
- Enable/disable theme flavour text per waypoint.

---

#### Challenge Type B — Power the Office (Virtual Battery)

A collective energy meter that must be kept charged.

**Features:**
- A large animated battery/energy gauge on the dashboard.
- Battery drains at a configurable rate (e.g. loses 500 EP per day).
- Team workouts replenish it.
- If battery hits 0%, a "blackout" event triggers (visual alert + optional Teams webhook message).
- Battery history graph (7-day and 30-day).

**Admin controls:**
- Set battery capacity (total EP).
- Set daily drain rate.
- Set "blackout" threshold and notification message.
- Connect optional Microsoft Teams webhook URL for automated channel messages.

---

#### Challenge Type C — Territory War (Hex Grid)

A map-based zone capture game.

**Features:**
- Admin uploads a map image and draws hex zones over it (click-to-place hexagons).
- Each hex has an EP cost to capture.
- Teams log activity; when a team's EP in a zone exceeds the cost, they capture it.
- Captured zones display team colour.
- A weekly "State of the War" snapshot can be generated as a shareable image.

**Admin controls:**
- Upload map, place and resize hex zones.
- Set EP cost per zone (can vary by zone).
- Set contested zone rules (can zones be recaptured?).
- Reset individual zones or full map.

---

#### Challenge Type D — The Build-Off

A construction-themed collective challenge.

**Features:**
- A virtual structure (rocket, building, etc.) is rendered as a layered progress illustration.
- Different activity types contribute different "materials":
  - Steps/Running → Foundation
  - Cycling → Wiring/Energy
  - Gym/HIIT → Superstructure
  - Yoga/Swim → Interior/Finishing
- Each material has a separate progress bar.
- When all materials hit 100%, the structure is "complete" and a celebration triggers.

**Admin controls:**
- Set material category targets.
- Map activity types to material categories.
- Set structure theme (rocket / HQ building / stadium — SVG illustration swappable).
- Set celebration trigger action (Teams message, banner, badge award).

---

#### Challenge Type E — Fitness Bingo

Personal bingo cards with customisable activity tasks.

**Features:**
- Admin creates a pool of bingo tasks (e.g. "Log 10,000 steps," "Cycle 5 miles," "Do a 20-min yoga session").
- Each participant gets a randomly assigned 5×5 bingo card from the pool.
- Participants mark off squares as they log matching workouts (auto-detection where possible).
- Lines (horizontal, vertical, diagonal) and full blackouts tracked.
- Leaderboard shows who has the most lines cleared.
- Optional: admin-defined prize tiers (1 line = bronze, 3 lines = silver, blackout = gold).

**Admin controls:**
- Add/edit/delete bingo tasks.
- Set card size (3×3, 4×4, 5×5).
- Toggle auto-detection vs manual claim.
- Set prize tier labels.
- Regenerate cards for all users or specific users.

---

### 5.5 Workout Logging

- Quick-log panel on dashboard: select activity, enter quantity, submit.
- Logs timestamped automatically.
- Users can add an optional note (e.g. "Morning commute," "Lunch run").
- Users can edit or delete their own logs within a configurable grace period (default: 24 hours). Admin can always edit/delete.
- Bulk import via CSV (for backdating historic data at launch).

---

### 5.6 Leaderboards & Statistics

**Individual Leaderboard:**
- Ranked by total EP (all-time, this week, this month).
- Columns: rank, name, team, total EP, workouts logged, current streak.
- Filterable by challenge, time period, activity type.

**Team Leaderboard:**
- Ranked by total team EP and average EP per member.
- Drill-down to see team member contributions.

**Personal Stats Dashboard:**
- Total EP earned (all time / this month / this week).
- Favourite activity (most logged).
- Longest streak.
- Badges and achievements.
- Workout history chart (bar chart by day/week).
- Comparison to team average and overall average.

**Global Analytics (Admin only):**
- Total workouts logged platform-wide.
- Most popular activity types.
- Engagement rate (% of registered users who logged this week).
- EP by day heatmap.
- Export all data as CSV.

---

### 5.7 Badges & Achievements

Admin-configurable achievement system.

**Default badges:**
| Badge | Trigger |
|-------|---------|
| First Step | Log first workout |
| Century | Earn 100 EP |
| On Fire | Log 7 days in a row |
| Team Player | Contribute to team top 3 |
| Bingo! | Complete a bingo line |
| Blackout | Complete a full bingo card |
| Journey's End | Reach a map waypoint |
| Power Surge | Contribute 500 EP to battery challenge |

Admin can create custom badges with name, icon (emoji), and trigger description.

---

### 5.8 Admin Panel

Single-page admin panel accessible via a PIN/password (stored locally or via Supabase row-level security).

**Admin panel sections:**
1. **Participants** — register, edit, deactivate, move between teams.
2. **Teams** — create, rename, recolour, merge, delete.
3. **Challenges** — create/edit/archive all five challenge types.
4. **Activity Config** — full CRUD for activity types and EP conversion rates.
5. **Bingo Tasks** — manage task pool and card settings.
6. **Map Editor** — upload map images, plot waypoints or hex zones.
7. **Badges** — create/edit/delete badges and award manually.
8. **Settings** — app name, logo, accent colour, grace period rules, Teams webhook URL.
9. **Data** — export full data as CSV; bulk import participants or workout logs.

---

### 5.9 Microsoft Teams Integration

- Admin provides a Teams Incoming Webhook URL in Settings.
- Automated notifications sent to channel on:
  - New user joins (optional).
  - Battery blackout warning (below threshold).
  - Waypoint reached on journey map.
  - Team captures a hex zone.
  - Build-Off structure completed.
  - Bingo blackout achieved.
  - Weekly leaderboard summary (scheduled via configurable day/time — requires a lightweight cron approach, e.g. a Supabase Edge Function or a free cron service hitting a webhook).
- All notification messages admin-editable.

---

## 6. Design System

### 6.1 Aesthetic Direction
**Peloton × Apple Glassmorphism**

- **Background:** Deep space dark — near-black (`#080B14`) with a subtle animated mesh gradient (deep navy, dark teal, midnight purple).
- **Cards:** Frosted glass — `rgba(255,255,255,0.06)` with `backdrop-filter: blur(20px)`, `1px solid rgba(255,255,255,0.1)` border.
- **Accent palette:**
  - Primary: Electric cyan `#00D4FF`
  - Secondary: Neon lime `#A3FF47`
  - Alert/energy: Vivid coral `#FF4D6A`
  - Gold/achievement: Warm amber `#FFB830`
- **Typography:**
  - Display/headings: `Bebas Neue` or `Barlow Condensed` (bold, athletic)
  - Body: `DM Sans` (clean, modern)
  - Numbers/stats: `JetBrains Mono` or `Roboto Mono` (data feel)
- **Motion:** Smooth transitions (300ms ease), number counter animations, progress bar fills, subtle card hover lifts (`transform: translateY(-2px)`), skeleton loaders.
- **Icons:** Lucide icons or Heroicons (consistent, modern).
- **Spacing:** 8px base grid, generous padding inside cards.

### 6.2 Key Screens

| Screen | Description |
|--------|-------------|
| **Landing / Login** | Full-screen dark hero with animated gradient, app name, tagline, Register / Login CTA |
| **Dashboard** | Personal stats hero, quick-log panel, active challenge progress, recent activity feed |
| **Leaderboard** | Individual + team tabs, rank animations, time filter tabs (Week / Month / All Time) |
| **Challenges** | Card per active challenge; click to open detail view for any format |
| **Journey Map** | Full-width map image with plotted route overlay and animated position pin |
| **My Stats** | Personal profile: charts, badges, history, streaks |
| **Admin Panel** | Sidebar navigation with all admin sections as clean sub-pages |
| **Bingo Card** | Responsive grid card with satisfying checkbox animation on completion |

---

## 7. Data Schema Summary

```sql
users (id, display_name, email, avatar_emoji, colour_hex, is_admin, created_at)
teams (id, name, colour_hex, icon_emoji, created_at)
team_members (user_id, team_id, joined_at)
activity_types (id, name, unit_label, ep_per_unit, icon_emoji, material_category, is_active)
workout_logs (id, user_id, activity_type_id, quantity, ep_earned, notes, logged_at, challenge_id)
challenges (id, name, type ENUM[journey|battery|hexwar|buildoff|bingo], config JSONB, is_active)
map_assets (id, challenge_id, image_url, waypoints JSONB, hex_zones JSONB)
bingo_tasks (id, challenge_id, label, activity_type_id, quantity_required)
bingo_cards (id, user_id, challenge_id, layout JSONB, completed_squares JSONB)
badges (id, name, icon_emoji, description, trigger_type, trigger_value)
user_badges (user_id, badge_id, awarded_at)
settings (key, value)  -- single-row config store
```

---

## 8. Out of Scope (v1.0)

- Native mobile app (responsive web app covers mobile use).
- Heart rate / wearable device integration (manual logging only in v1).
- Payment or prize fulfilment processing.
- Live video/class streaming.
- External fitness API integrations (Strava, Garmin, Apple Health) — potential v2 feature.

---

## 9. Suggested v2 Features

- Strava / Garmin OAuth auto-import of workouts.
- Push notifications (PWA).
- Photo evidence upload for workout logs.
- Emoji reaction system on activity feed.
- Custom challenge types (admin-built from scratch).
- Dark/light mode toggle.

---

## 10. Delivery Phases

| Phase | Scope | Estimated Effort |
|-------|-------|-----------------|
| **Phase 1 — Core** | Registration, teams, activity logging, EP conversion engine, individual leaderboard, admin panel basics | ~3–4 days |
| **Phase 2 — Challenges** | Journey map, Power Battery, Bingo card | ~2–3 days |
| **Phase 3 — Advanced** | Hex Territory War, Build-Off, full badge system | ~2 days |
| **Phase 4 — Polish** | Teams webhook, CSV export/import, analytics dashboard, full mobile optimisation | ~1–2 days |

---

## 11. Dependencies & Free-Tier Limits

| Service | Free Limit | Likely Usage |
|---------|-----------|--------------|
| GitHub Pages | Unlimited static hosting | ✅ Well within limits |
| Supabase | 500MB DB, 1GB storage, 50k MAU | ✅ Easily sufficient for internal team use |
| Google Fonts | Unlimited | ✅ |
| Lucide Icons (CDN) | Unlimited | ✅ |

**Total cost: £0/month.**

---

*End of Document — FitChallenge PRD v1.0*
