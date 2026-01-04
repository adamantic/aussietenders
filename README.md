# GovTender Pro

An AI-powered platform helping Small and Medium Enterprises (SMEs) discover and compete for Australian federal government contracts.

## Features

- **Real Tender Data**: Aggregates tenders from AusTender (Federal) - automatically syncs real contract data with no credentials required
  
- **AI-Powered Summaries**: Get instant AI-generated summaries of tender documents using Anthropic Claude

- **Pipeline Management**: Track tender opportunities through customizable Kanban-style stages

- **Smart Search**: Filter tenders by status, category, and more

- **Company Profiles**: Manage your business profile for tender applications

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Anthropic API key (for AI features)

### Environment Variables

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY` - Anthropic Claude API key

### Installation

```bash
npm install
npm run db:push
npm run dev
```

## API Data Sources

### AusTender (Federal)
- **Status**: Working out of the box - no credentials required
- **Data**: Real-time contract notices from the last 30 days
- **Format**: OCDS (Open Contracting Data Standard)
- **Endpoint**: https://api.tenders.gov.au

The platform automatically syncs approximately 100 federal tenders on startup.

## Admin Endpoints

These endpoints are available for manual sync operations:

- `POST /api/admin/sync-tenders` - Manually trigger tender sync from all sources
- `GET /api/admin/sync-status` - Check connection status and tender counts

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit OpenID Connect
- **AI**: Anthropic Claude API

## License

Proprietary - All rights reserved
