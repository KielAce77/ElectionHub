-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create Organizations table
create table public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Profiles table (extending Supabase Auth)
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  organization_id uuid references public.organizations on delete cascade,
  email text not null,
  full_name text,
  role text check (role in ('admin', 'voter')) not null default 'voter',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Elections table
create table public.elections (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references public.organizations on delete cascade not null,
  title text not null,
  description text,
  start_date timestamp with time zone not null,
  end_date timestamp with time zone not null,
  status text check (status in ('upcoming', 'active', 'closed')) not null default 'upcoming',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Positions table
create table public.positions (
  id uuid primary key default uuid_generate_v4(),
  election_id uuid references public.elections on delete cascade not null,
  title text not null,
  max_votes integer not null default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Candidates table
create table public.candidates (
  id uuid primary key default uuid_generate_v4(),
  position_id uuid references public.positions on delete cascade not null,
  full_name text not null,
  bio text,
  photo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Votes table
create table public.votes (
  id uuid primary key default uuid_generate_v4(),
  voter_id uuid references public.profiles(id) on delete cascade not null,
  candidate_id uuid references public.candidates(id) on delete cascade not null,
  position_id uuid references public.positions(id) on delete cascade not null,
  election_id uuid references public.elections(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  -- Ensure unique vote per position per voter
  unique(voter_id, position_id)
);

-- Enable RLS
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.elections enable row level security;
alter table public.positions enable row level security;
alter table public.candidates enable row level security;
alter table public.votes enable row level security;

-- Policies --

-- Organizations: users can see their own organization
create policy "Users can view their own organization"
  on public.organizations for select
  using ( id in (select organization_id from public.profiles where id = auth.uid()) );

-- Profiles: users can see their own profile, admins can see all in org
create policy "Users can view own profile"
  on public.profiles for select
  using ( auth.uid() = id );

create policy "Admins can view all profiles in org"
  on public.profiles for select
  using ( 
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin' 
      and organization_id = public.profiles.organization_id
    )
  );

-- Elections: everyone in org can view, only admins can manage
create policy "Users can view elections in their org"
  on public.elections for select
  using ( organization_id in (select organization_id from public.profiles where id = auth.uid()) );

create policy "Admins can manage elections"
  on public.elections for all
  using ( 
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin' 
      and organization_id = public.elections.organization_id
    )
  );

-- Positions & Candidates: logical follow-through from elections
create policy "Users can view positions"
  on public.positions for select
  using ( election_id in (select id from public.elections) );

create policy "Admins can manage positions"
  on public.positions for all
  using ( election_id in (select id from public.elections) );

create policy "Users can view candidates"
  on public.candidates for select
  using ( position_id in (select id from public.positions) );

create policy "Admins can manage candidates"
  on public.candidates for all
  using ( position_id in (select id from public.positions) );

-- Votes: voters can only insert their own, admins can view all in org
create policy "Voters can cast votes"
  on public.votes for insert
  with check ( auth.uid() = voter_id );

create policy "Users can view results"
  on public.votes for select
  using ( election_id in (select id from public.elections) );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role, organization_id)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    coalesce(new.raw_user_meta_data->>'role', 'voter'),
    (new.raw_user_meta_data->>'organization_id')::uuid
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
