# C848N

A Catan score tracker for friend groups that are in it for the long haul. Log each game with its players, victory points and winner, group players into friend groups, and browse the history of past games.

## Features

- New game: pick a group, a game type and the players, then enter victory points and mark the winner
- History: browse and edit past games
- Setup: manage players, groups and game types (for example Base and Seafarers scenarios)
- Dashboard: cross-group stats
- Email and password sign-in, with a password reset flow

## Stack

- TanStack Start (file-based routing, SSR) with React and TypeScript
- Tailwind CSS and shadcn/ui components
- Supabase for Postgres, auth and row-level security
- Built with Lovable

## Run it yourself

You need your own Supabase project. This repo contains no credentials.

1. Install dependencies: `bun install`
2. Copy `.env.example` to `.env` and fill in the URL, project ref and publishable key from your Supabase project
3. Apply the SQL in `supabase/migrations/` to your project (Supabase SQL editor or `supabase db push`)
4. Start the dev server: `bun run dev`

## Security note

The bundled migrations use permissive row-level-security policies to keep the schema simple. Review and tighten them (for example, restrict access to authenticated users) before deploying anywhere public.

## Status

Personal project for tracking games with friends. Not a maintained product.
