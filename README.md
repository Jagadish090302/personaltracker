# Black Notebook — 90-Day Tracker (v1)

A beginner-friendly React + Vite starter for a private self-improvement tracker. GitHub Pages hosts the static frontend; Supabase provides email/password authentication and PostgreSQL storage protected by Row Level Security (RLS).

## Included in v1

- Email/password sign-up and sign-in
- Six daily focus areas: discipline, skills, income, fitness, content, focus
- Daily check-offs and short reflection notes
- Completion percentage, seven-day consistency, total completed actions, and a 90-day counter
- Lightweight, rule-based recommendations (no paid AI API)
- Dark modern dashboard with responsive mobile layout
- Supabase RLS policies scoped to `auth.uid()`
- GitHub Actions deployment to GitHub Pages

## 1. Supabase connection

This starter ZIP is preconfigured locally with the Project URL and public publishable key you supplied. The values are in `.env.local`, which Vite reads for local development. The key is a public browser key, not an administrative secret. Do not add a `service_role` key here.

If you deploy with GitHub Actions, also add repository variables named `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as described below; GitHub Actions does not automatically read your local `.env.local` file.

## 2. Set up the database

1. Open your existing project at https://supabase.com/dashboard and save the database password somewhere safe.
2. Open **SQL Editor** in the Supabase dashboard.
3. Open `supabase/schema.sql` from this repository, copy the entire file, paste it into SQL Editor, and run it.
4. Open **Project Settings → API** (the exact menu labels can change).
5. Copy the Project URL and the **publishable key** (or legacy `anon` key). These are intended for browser use when RLS is configured. **Never use the `service_role` key in this app.**

## 3. Run it on your computer

Install Node.js 20 or newer from https://nodejs.org/.

```bash
npm install
cp .env.example .env.local
```

The included `.env.local` is already configured. If you need to change projects later, edit `.env.local`:

```text
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_PUBLISHABLE_OR_ANON_KEY
```

Then start the local development server:

```bash
npm run dev
```

Open the local URL printed in the terminal. Use an email address you can access. If Supabase email confirmation is enabled, confirm the email before signing in. You can configure the email confirmation behavior in Supabase Auth settings.

## 4. Push the project to GitHub

1. Create a new GitHub repository, for example `black-notebook-tracker`.
2. Extract this ZIP and upload/push the **contents** of the folder into the repository's `main` branch. Do not upload `node_modules` or `.env.local`.
3. In the repository, open **Settings → Secrets and variables → Actions → Variables**.
4. Add these repository variables:
   - `VITE_SUPABASE_URL` = your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` = your public publishable/anon key
5. Open **Settings → Pages** and choose **GitHub Actions** as the build/deployment source.
6. Open **Actions** and wait for “Deploy Black Notebook to GitHub Pages” to finish. The published URL appears in the deployment summary.

The frontend key is visible to visitors by design; the database must be protected by RLS. Do not place passwords, service-role keys, or other privileged credentials in GitHub variables used by the frontend build.

## 5. Supabase Auth URL settings

In Supabase **Authentication → URL Configuration**, add your deployed GitHub Pages URL to the allowed redirect URLs. Also add your local development URL (for example `http://localhost:5173`) while testing. Use the exact deployed URL shown by GitHub Pages.

## 6. Verify user data isolation

1. Create account A and check off a habit. Confirm it appears after refreshing.
2. Sign out and create account B using a different email.
3. Account B must not see account A's records.
4. Sign back into account A; its records should still be present.

RLS policies in `supabase/schema.sql` enforce `auth.uid() = user_id` for every read/write operation. Do not disable RLS to “fix” access errors.

## Current v1 limitations / next upgrades

- The six daily actions are starter defaults; customizable tasks and a full plan editor are planned next.
- The plan start date is currently initialized from the first saved log that includes it. Start the plan by saving today's reflection or checking off an action.
- Weekly stats use the recent seven calendar days. More advanced streak and trend calculations can be added after the base is verified.
- Password reset, export/delete account, and AI-assisted coaching are not included yet.
- Do not treat the rule-based suggestions as medical, financial, or professional advice.

## Troubleshooting

- **“Missing Supabase environment variables” setup screen:** check `.env.local` values, restart `npm run dev`, and verify the GitHub Actions variables.
- **Invalid API key / fetch error:** check the Project URL and public publishable/anon key; avoid extra spaces.
- **Email confirmation issue:** check the Supabase Auth email settings and allowed redirect URLs.
- **Permission denied / RLS error:** verify `schema.sql` ran successfully and that you are signed in. Keep RLS enabled.
- **GitHub Pages 404:** make sure Pages source is GitHub Actions and the latest workflow completed successfully.
