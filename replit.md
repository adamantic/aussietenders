# GovTender Pro

## Overview

GovTender Pro is an AI-powered platform that helps Small and Medium Enterprises (SMEs) discover and apply for government contracts. The application aggregates tenders from NSW and Federal Australian sources (AusTender, NSW eTendering), provides AI-generated summaries using Anthropic Claude, and offers pipeline management for tracking tender opportunities.

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
- **Authentication**: Replit OpenID Connect (OIDC) with Passport.js and express-session
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple
- **AI Integration**: Anthropic Claude API for tender summarization

The server follows a modular structure with routes, storage layer, and Replit integrations separated into distinct modules. The storage layer implements an interface pattern for database operations.

### API Design
- RESTful API endpoints defined in `shared/routes.ts` with Zod schemas for validation
- Type-safe route definitions shared between frontend and backend
- Endpoints for tenders, pipeline management, company profiles, saved searches, and AI chat

### Database Schema
- **users/sessions**: Replit Auth user management (mandatory tables)
- **tenders**: Government tender listings with source, status, categories, and AI summaries
- **companies**: User company profiles linked to auth users
- **pipelineItems**: User's tender tracking pipeline with stages
- **savedSearches**: Stored search filters for quick access
- **conversations/messages**: AI chat history

### Authentication Flow
Uses Replit Auth (OpenID Connect) with automatic user provisioning. Session tokens stored in PostgreSQL with 7-day expiry. Protected routes check authentication via middleware.

## External Dependencies

### AI Services
- **Anthropic Claude API**: Used for generating tender summaries and AI chat functionality
- Environment variables: `AI_INTEGRATIONS_ANTHROPIC_API_KEY`, `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`

### Database
- **PostgreSQL**: Primary data store
- Environment variable: `DATABASE_URL`
- Schema migrations via Drizzle Kit (`npm run db:push`)

### Authentication
- **Replit Auth**: OpenID Connect provider
- Environment variables: `ISSUER_URL`, `REPL_ID`, `SESSION_SECRET`

### Third-Party Libraries
- **Drizzle ORM**: Type-safe database queries with PostgreSQL dialect
- **Zod**: Runtime schema validation for API requests/responses
- **TanStack Query**: Client-side data fetching and caching
- **date-fns**: Date formatting utilities
- **shadcn/ui**: Pre-built accessible UI components