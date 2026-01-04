# GovTender Pro

An AI-powered platform helping Small and Medium Enterprises (SMEs) discover and compete for Australian government contracts.

## Features

- **Real Tender Data**: Aggregates tenders from Australian government sources
  - AusTender (Federal) - Automatically syncs real contract data (no credentials required)
  - NSW eTendering - Optional, requires API credentials
  
- **AI-Powered Summaries**: Get instant AI-generated summaries of tender documents using Anthropic Claude

- **Pipeline Management**: Track tender opportunities through customizable Kanban-style stages

- **Smart Search**: Filter tenders by source, status, category, and more

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

Optional (for NSW tender data):
- `NSW_API_KEY` - OAuth Bearer token from api.nsw.gov.au

### Installation

```bash
npm install
npm run db:push
npm run dev
```

## API Data Sources

### AusTender (Federal) - Active
- **Status**: Working out of the box - no credentials required
- **Data**: Real-time contract notices from the last 30 days
- **Format**: OCDS (Open Contracting Data Standard)
- **Endpoint**: https://api.tenders.gov.au

The platform automatically syncs approximately 100 federal tenders on startup.

### NSW eTendering - Currently Unavailable
- **Status**: The NSW API blocks requests from cloud server environments
- **Issue**: NSW eTendering uses aggressive bot protection (WAF) that returns empty responses for server-side requests
- **Workaround needed**: May require a proxy service or scheduled job running from a different environment
- **Note**: The platform operates with AusTender (Federal) data which provides real government tender opportunities

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
