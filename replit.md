# Aussie Tenders

## Overview

Aussie Tenders is an AI-powered platform that helps Small and Medium Enterprises (SMEs) discover and apply for government contracts. The application aggregates tenders from NSW and Federal Australian sources (AusTender, NSW eTendering), provides AI-generated summaries using Anthropic Claude, and offers pipeline management for tracking tender opportunities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **Build Tool**: Vite with HMR support

The frontend follows a page-based structure with protected routes requiring authentication. Key pages include Dashboard, Search, Pipeline (Kanban-style tender tracking), and Company Profile management.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Clerk authentication with @clerk/express middleware
- **AI Integration**: Anthropic Claude API for tender summarization

The server follows a modular structure with routes, storage layer, and Replit integrations separated into distinct modules. The storage layer implements an interface pattern for database operations.

### API Design
- RESTful API endpoints defined in `shared/routes.ts` with Zod schemas for validation
- Type-safe route definitions shared between frontend and backend
- Endpoints for tenders, pipeline management, company profiles, saved searches, and AI chat

### Database Schema
- **users**: User profiles linked to Clerk user IDs
- **tenders**: Government tender listings with source, status, categories, and AI summaries
- **companies**: User company profiles linked to auth users
- **pipelineItems**: User's tender tracking pipeline with stages
- **savedSearches**: Stored search filters for quick access
- **conversations/messages**: AI chat history

### Authentication Flow
Uses Clerk authentication with automatic user provisioning. Frontend uses ClerkProvider and useUser hook for auth state. Backend uses clerkMiddleware to validate tokens and clerkClient.users.getUser() to fetch user profiles. Protected routes check authentication via isAuthenticated middleware.

### Recent Features (January 2026)
- **Mobile Responsive Layout**: Collapsible sidebar with hamburger menu on mobile (< lg breakpoint)
- **Sorting**: 5 sort options (Newest First, Closing Soon, Highest Value, Agency A-Z, Location A-Z)
- **Export**: CSV (up to 1000 tenders) and PDF (up to 100 tenders) export with current filters

## External Dependencies

### AI Services
- **Anthropic Claude API**: Used for generating tender summaries and AI chat functionality
- Environment variables: `AI_INTEGRATIONS_ANTHROPIC_API_KEY`, `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`

### Database
- **PostgreSQL**: Primary data store
- Environment variable: `DATABASE_URL`
- Schema migrations via Drizzle Kit (`npm run db:push`)

### Authentication
- **Clerk**: User authentication and session management
- Environment variables: `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`

### Third-Party Libraries
- **Drizzle ORM**: Type-safe database queries with PostgreSQL dialect
- **Zod**: Runtime schema validation for API requests/responses
- **TanStack Query**: Client-side data fetching and caching
- **date-fns**: Date formatting utilities
- **shadcn/ui**: Pre-built accessible UI components