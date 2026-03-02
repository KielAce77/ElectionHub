# ElectionHub - Online Voting System

A secure, modern, and transparent online voting system built with React, TailwindCSS, and Supabase.

## Features

- **Dual Roles**: Admin and Voter dashboards.
- **Secure Authentication**: Power by Supabase Auth (Email/Password).
- **Dynamic Ballot**: Admins can create elections with multiple positions and candidates.
- **Real-time Analytics**: Visualization of voter turnout and results using Chart.js.
- **Mobile First**: Fully responsive design for voting on any device.
- **Integrity**: Row Level Security (RLS) ensures voters only see their organization's elections and only vote once per position.

## Project Structure

```text
src/
├── components/
│   ├── ui/          # Reusable UI components (Button, Input, Card)
│   └── layout/      # Layout components (Navbar, Sidebar)
├── contexts/        # AuthContext for state management
├── lib/             # Supabase client initialization
├── pages/
│   ├── auth/        # Login and Authentication pages
│   ├── voter/       # Voter-specific views (Dashboard, Ballot)
│   └── admin/       # Admin-specific views (Dashboard, Election Manager)
├── App.jsx          # Route management and RLS enforcement
├── index.css        # Global styles and design system
└── main.jsx         # Entry point
```

## Setup Instructions

### 1. Supabase Project
1. Create a new project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** and run the provided `supabase_schema.sql` script.
3. In **Authentication -> Providers**, ensure Email is enabled.
4. Go to **Storage** and create a public bucket named `candidate-photos`.

### 2. Environment Variables
1. Create a `.env` file in the root directory.
2. Add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

### 3. Installation
```bash
npm install
npm run dev
```

### 4. Setting up an Admin User
Since the system is organization-based:
1. Manually create an entry in the `organizations` table.
2. Sign up a user via the application or Supabase dashboard.
3. Update the user's role to `admin` and assign the `organization_id` in the `profiles` table.

## Security
- **RLS**: Policies are configured to restrict data access based on the user's organization and role.
- **Uniqueness**: The `votes` table has a unique constraint on `(voter_id, position_id)` to prevent double voting.
