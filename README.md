# Insta from Meesho

Insta from Meesho is a full-stack social media web application inspired by Instagram. It is built with React and TypeScript on the frontend, and Supabase for authentication, database, storage, and real-time messaging.

## Executive Summary

The application supports end-to-end social interactions:

- User authentication (sign up, sign in, sign out)
- Post creation with media upload
- Feed consumption with likes and comments
- Profile management with follow/unfollow
- Stories with expiry and view tracking
- Explore and user search
- Activity stream for engagement events
- Real-time direct messaging

The project is organized as a clean feature-based frontend with a Supabase-backed data model and row-level security policies.

## Technology Stack

- Frontend: React 18, TypeScript, Vite
- UI: Tailwind CSS, shadcn/ui, Radix UI, Lucide icons
- Routing: React Router
- Backend platform: Supabase (Auth, Postgres, Storage, Realtime)
- Testing: Vitest + Testing Library

## System Architecture

### Application shell

- `src/main.tsx` bootstraps the React app
- `src/App.tsx` configures global providers and top-level routes
- `src/pages/Index.tsx` is the authenticated app entry that conditionally renders either auth or the main product routes

### Authentication layer

- `src/contexts/AuthContext.tsx` centralizes session state and user identity
- Auth state is synchronized through Supabase session APIs and auth state listeners
- Protected UX is handled by route-level gating in `Index.tsx`

### Data and backend layer

- `src/integrations/supabase/client.ts` creates the typed Supabase client
- `src/integrations/supabase/types.ts` contains generated database typings
- `supabase/migrations/` defines schema evolution, policies, and RPC functions

## Component-by-Component Reference

### Root and page components

- `src/App.tsx` - Global provider composition (Query, Auth, Toast, Tooltip, Router)
- `src/pages/Index.tsx` - Auth-aware route switch and main layout orchestration
- `src/pages/NotFound.tsx` - 404 fallback page for unmatched routes

### Navigation and layout

- `src/components/Sidebar.tsx` - Desktop sidebar and mobile bottom navigation with active-route highlighting
- `src/components/NavLink.tsx` - Compatibility wrapper for `react-router-dom` nav link behavior

### Authentication

- `src/components/AuthPage.tsx` - Login and registration form with Supabase auth actions

### Feed and engagement

- `src/components/FeedPage.tsx` - Main feed, current user card, and follow suggestions
- `src/components/PostCard.tsx` - Post rendering with likes, comments, and timestamp formatting

### Content creation

- `src/components/CreatePost.tsx` - Media upload workflow and post record creation

### Profile management

- `src/components/ProfilePage.tsx` - Public/own profile view with follow stats and posts grid
- `src/components/EditProfileModal.tsx` - Profile edit form for avatar, username, bio, and website

### Discovery and activity

- `src/components/ExplorePage.tsx` - User search and discover grid of recent posts
- `src/components/ActivityPage.tsx` - Notifications-style stream of likes/comments on user posts

### Stories

- `src/components/StoriesBar.tsx` - Story strip, viewer modal, progress controls, and view recording

### Messaging

- `src/components/MessagesPage.tsx` - Conversations, chat UI, new chat modal, and real-time message updates

### Shared UI primitives

- `src/components/ui/*` - Reusable design-system primitives generated from shadcn/ui

## Database and Security Overview

### Core tables

- `profiles`, `posts`, `likes`, `comments`, `follows`
- `stories`, `story_views`
- `conversations`, `conversation_participants`, `messages`

### Storage buckets

- `posts` for post media
- `avatars` for user profile images
- `stories` for story media

### Security model

- Row-level security (RLS) is enabled on core business tables
- Public read policies are applied where required for social visibility
- Mutations (insert, update, delete) are constrained to authenticated and ownership-safe access
- Messaging uses RPC function `create_conversation_with_participants` to support secure conversation creation under RLS

## Real-Time Functionality

Direct messaging subscribes to realtime inserts on the `messages` table for the selected conversation, enabling live chat updates without page refresh.

## Project Structure

```text
src/
  components/         # Feature components and pages
  components/ui/      # Shared UI primitives
  contexts/           # Global context providers
  hooks/              # Custom hooks
  integrations/       # Supabase client and generated types
  pages/              # Route entry pages
supabase/
  migrations/         # Database schema, policies, and SQL functions
```

## Local Development

### Prerequisites

- Node.js 18+
- npm
- Supabase project URL and publishable key

### Environment variables

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

### Commands

```bash
npm install
npm run dev
```

Additional scripts:

```bash
npm run build
npm run preview
npm run lint
npm run test
```

## Current Maturity

The project is a production-structured MVP with robust foundations in authentication, social interactions, media handling, and realtime messaging. It is well-positioned for extensions such as richer notifications, post detail workflows, and advanced moderation/reporting features.
