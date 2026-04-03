<div align="center">

# MessBuddy

Campus mess management for students and vendors, built with HTML, CSS, JavaScript, and Supabase.

[Live Demo](https://full-stack-dev-project.vercel.app/welcome.html) | [Technical Docs](./PROJECT_DOCUMENTATION.md) | [Diagrams](./DIAGRAMS.md) | [Security Policy](./SECURITY.md)

</div>

## Overview

MessBuddy is a role-based web app designed to make campus meal planning clearer and faster.

- Students can check daily menus, compare tiers, view ratings, and use location-aware mess details.
- Vendors can publish daily menu cards, manage mess information, and update locations from a single dashboard.

The project is implemented as a static multi-page frontend and uses Supabase for authentication and cloud persistence.

## Why This Project

In many colleges, mess information is scattered across notice boards, chats, or word of mouth. MessBuddy turns that into a structured digital workflow where:

- students know what is being served before visiting
- vendors can update menus quickly
- ratings improve transparency
- location and timing details reduce confusion

## Quick Look

| Area | What it does |
| --- | --- |
| Student experience | Browse menus, apply filters, view directions, rate meals |
| Vendor experience | Create, edit, delete, and reuse daily menu cards |
| Backend | Supabase Auth + Supabase database |
| Offline resilience | localStorage fallback for menu data |
| UX layer | PWA install support, service worker, responsive pages |

## Navigation

- [Live Demo](https://full-stack-dev-project.vercel.app/welcome.html)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [How It Works](#how-it-works)
- [Project Structure](#project-structure)
- [Run Locally](#run-locally)
- [Deployment Notes](#deployment-notes)
- [Database and Supabase](#database-and-supabase)
- [Documentation Hub](#documentation-hub)

## Features

- Role-based login for students and vendors
- Student dashboard with search, tier filters, price filters, vegetarian-only filter, and date filter
- Vendor dashboard for daily menu publishing and updates
- Menu ratings stored per student account
- Saved locations for both student and vendor users
- Map-based directions and location preview support
- Progressive Web App support with service worker and install prompt
- Local fallback storage when cloud data is unavailable

## Tech Stack

- Frontend: HTML5, CSS3, JavaScript
- Authentication and database: Supabase
- Maps and geocoding: Google Maps embed links, OpenStreetMap, Nominatim, Leaflet
- Deployment: Vercel
- PWA: Web App Manifest + Service Worker

## How It Works

### Student Flow

1. Open the welcome page and continue to login.
2. Sign in as a student using email/password or Google.
3. Browse menus by date and tier.
4. Filter by search, price, and vegetarian preference.
5. Open a menu card to view details, directions, and submit ratings.

### Vendor Flow

1. Log in as a vendor.
2. Set the mess name for the account.
3. Create or update a menu card for the selected date.
4. Attach address and coordinates using suggestions, map picker, current location, or map link.
5. Edit, delete, or reuse older menu cards as presets.

## Project Structure

```text
.
|-- index.html
|-- welcome.html / welcome.css / script.js
|-- login.html / login.css / login.js
|-- student-dashboard.html / student-dashboard.js
|-- vendor-dashboard.html / vendor-dashboard.js / vendor-dashboard.css
|-- profile.html / profile.css / profile.js
|-- menu-details.html / menu-details.css / menu-details.js
|-- menu-data.js
|-- pwa.js
|-- sw.js
|-- manifest.webmanifest
|-- assets/
`-- supabase/
```

## Main Pages

- `welcome.html`: product landing page
- `login.html`: role-based authentication entry
- `student-dashboard.html`: menu browsing, filtering, ratings, and directions
- `vendor-dashboard.html`: vendor menu management and location setup
- `profile.html`: profile and session details
- `menu-details.html`: detailed menu view

## Run Locally

This project does not require a build step. Any static server will work.

### Option 1: VS Code Live Server

1. Open the project folder in VS Code.
2. Start Live Server from `welcome.html` or `index.html`.
3. Open the generated local URL in your browser.

### Option 2: Python static server

```powershell
python -m http.server 5500
```

Then open:

`http://localhost:5500/welcome.html`

## Deployment Notes

The project is suitable for static hosting providers such as:

- Vercel
- Netlify
- GitHub Pages

For production deployment, make sure:

- all HTML, CSS, JS, and asset files are hosted together
- the site is served over `https`
- Supabase authentication redirect URLs include the deployed domain
- service worker and manifest files remain accessible from the root

## Database and Supabase

The frontend currently expects these main Supabase tables:

- `vendor_mess_cards`
- `menu_ratings`
- `user_locations`

Run these SQL files in the Supabase SQL Editor:

- `supabase/vendor_mess_cards_hardening.sql`
- `supabase/menu_ratings.sql`
- `supabase/user_locations.sql`

These scripts provide:

- one menu per vendor per day
- non-empty menu item validation
- ratings storage with row-level security
- user location storage with row-level security

## Documentation Hub

Use the links below depending on what a visitor wants to understand:

- [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md): full technical documentation
- [DIAGRAMS.md](./DIAGRAMS.md): architecture, flow, ER, and deployment diagrams
- [SECURITY.md](./SECURITY.md): security reporting and policy information
- [LICENSE](./LICENSE): usage and rights notice

## Contributors

- Chaitanya Atale
- Shrinath Petil
- Kshitij Musale

## Security Notes

- The frontend contains Supabase browser-side configuration for client access.
- Row-level security should remain enabled on Supabase tables.
- Allowed origins and redirect URLs should be configured correctly in Supabase.
- See [SECURITY.md](./SECURITY.md) for the repository security policy.

## Project Status

MessBuddy is currently a frontend-first campus meal platform with working student and vendor flows, Supabase-backed persistence, and documentation for architecture and setup. It is a strong base for further improvements such as automated tests, environment-based configuration, and extended admin workflows.

## Usage Rights

This repository is currently distributed as `All Rights Reserved`.
See [LICENSE](./LICENSE) for the current usage restrictions.
