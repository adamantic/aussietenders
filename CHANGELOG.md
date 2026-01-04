# Changelog

All notable changes to GovTender Pro will be documented in this file.

## [1.1.0] - 2026-01-04

### Added
- **Real Government API Integrations**
  - AusTender (Federal) API integration fetching real contract data from last 30 days
  - NSW eTendering API integration (requires API credentials from api.nsw.gov.au)
  
- **Admin Sync Endpoints**
  - `POST /api/admin/sync-tenders` - Manual trigger for tender sync
  - `GET /api/admin/sync-status` - Connection status and tender counts

- **Automatic Tender Sync**
  - Server automatically syncs tenders from government APIs on startup
  - OCDS (Open Contracting Data Standard) support for AusTender

### Changed
- Removed sample/seed data - database now populated exclusively from government APIs
- Updated tender mapping to extract proper contract details (titles, descriptions, values, agencies, locations)
- Dashboard source filter now shows only AusTender and NSW options

### Fixed
- View Details dialog authentication control using controlled state
- Pipeline mutation type handling for authenticated requests
- Foreign key constraint handling when syncing tenders with existing pipeline items

### Security
- Admin endpoints now require authentication

## [1.0.0] - 2026-01-03

### Added
- Initial release of GovTender Pro
- User authentication via Replit OpenID Connect
- Tender search and filtering
- AI-powered tender summaries using Anthropic Claude
- Pipeline management with Kanban-style stages
- Company profile management
- Saved search functionality
- AI chat assistant for tender questions
