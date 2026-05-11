# Tabata Timer Gift App

A romantic Tabata timer built with Next.js for a gift-style workout experience.

## Features

- Intro page with hero image and mandatory video gate
- Timer for warmup, work, rest, sets, and cooldown
- Warning sound at both 2 seconds and 1 second remaining in each phase
- "Go" sound when each phase reaches zero
- Optional custom start voice and random cheer tracks
- Saved workout programs via Supabase
- Last used program remembered per browser with `localStorage`

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Add your Supabase values to `.env.local`.

4. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Supabase table

Create a table called `workout_programs` with these columns:

```sql
create table if not exists public.workout_programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  warmup_seconds integer not null,
  work_seconds integer not null,
  rest_seconds integer not null,
  sets integer not null,
  cooldown_seconds integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Optional update trigger:

```sql
create or replace function public.set_current_timestamp_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_workout_programs_updated_at on public.workout_programs;

create trigger set_workout_programs_updated_at
before update on public.workout_programs
for each row
execute procedure public.set_current_timestamp_updated_at();
```

The app uses server-side route handlers with `SUPABASE_SERVICE_ROLE_KEY`, so no public auth setup is required in v1.

## Replace media

- Girlfriend image: `public/images/girlfriend-placeholder.svg`
- Suggested real file: `public/images/girlfriend-photo.jpg`
- Intro video: `public/video/intro.mp4`
- Audio folder: `public/audio/`

If your audio files are missing, the timer still runs. The warning sound falls back to a generated beep.

## Deploy to Vercel

1. Push the project to GitHub.
2. Import it into Vercel.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel project settings.
4. Redeploy after adding your image, intro video, and audio files.
