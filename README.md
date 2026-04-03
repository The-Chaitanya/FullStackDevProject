# MessBuddy

MessBuddy is a campus mess management web app built for two user groups:

- Students can browse daily menus, compare meal tiers, view ratings, and check mess locations.
- Vendors can log in, publish or update their daily menu card, manage mess details, and set location data.

The project is built with plain HTML, CSS, and JavaScript, and uses Supabase for authentication and cloud data storage.

## Live Demo

`https://full-stack-dev-project.vercel.app/welcome.html`

## Contributors

- Chaitanya Atale
- Shrinath Petil
- Kshitij Musale

## Features

- Role-based login for students and vendors
- Student dashboard with search, tier filters, price filters, vegetarian-only filter, and date filter
- Vendor dashboard for creating, updating, and deleting daily menu cards
- Menu ratings stored per student account
- Saved user locations for both students and vendors
- Map-based location support with directions and location previews
- Progressive Web App support with install prompt and service worker
- Local fallback storage when cloud data is unavailable

## Tech Stack

- Frontend: HTML5, CSS3, JavaScript
- Authentication and database: Supabase
- Maps and geocoding: Google Maps embed links, OpenStreetMap, Nominatim, Leaflet
- Deployment: Vercel
- PWA: Web App Manifest + Service Worker

## Project Structure

```text
.
|-- index.html
|-- welcome.html / welcome.css / script.js
|-- login.html / login.css / login.js
|-- student-dashboard.html / student-dashboard.js
|-- vendor-dashboard.html / vendor-dashboard.js
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

- `welcome.html`: landing page and app entry screen
- `login.html`: student/vendor authentication page
- `student-dashboard.html`: menu browsing, filtering, rating, and directions
- `vendor-dashboard.html`: vendor menu management and location setup
- `profile.html`: user profile page
- `menu-details.html`: separate menu details view

## How It Works

### Student flow

1. Open the welcome page and continue to login.
2. Sign in as a student using email/password or Google.
3. Browse available menus by day.
4. Filter by tier, price, vegetarian option, and search text.
5. Open a menu card to view full details, map location, and submit ratings.

### Vendor flow

1. Log in as a vendor.
2. Set the mess name for the account.
3. Add or update a daily menu card for the selected date.
4. Attach address and coordinates using current location, map picker, or map link.
5. View, edit, delete, or reuse older menus as presets.

## Supabase Setup

This project currently uses Supabase in the frontend through the hosted JS SDK.

### SQL scripts included

Run these scripts in the Supabase SQL Editor:

- `supabase/vendor_mess_cards_hardening.sql`
- `supabase/menu_ratings.sql`
- `supabase/user_locations.sql`

These scripts add:

- menu uniqueness per vendor per day
- non-empty menu item validation
- menu rating storage with row-level security
- user location storage with row-level security

## Local Development

This project does not use a Node-based build step. You can run it with any static server.

### Option 1: VS Code Live Server

1. Open the project folder in VS Code.
2. Start Live Server from `welcome.html` or `index.html`.
3. Open the generated local URL in the browser.

### Option 2: Simple local static server

If Python is installed:

```powershell
python -m http.server 5500
```

Then open:

`http://localhost:5500/welcome.html`

## Deployment

The app is suitable for static hosting platforms such as:

- Vercel
- Netlify
- GitHub Pages

For production, make sure:

- all HTML, CSS, JS, and asset files are deployed together
- the site is served over `https`
- Supabase authentication redirect URLs include the deployed domain
- service worker and manifest files are reachable from the root

## Current Data Model

The frontend expects these main Supabase tables:

- `vendor_mess_cards`
- `menu_ratings`
- `user_locations`

## Security Notes

- The frontend currently contains Supabase project credentials intended for browser use.
- Row-level security should remain enabled on Supabase tables.
- Authentication redirect URLs and allowed origins should be configured in Supabase.
- See `SECURITY.md` for the repository security policy.

## Documentation

For more detailed technical notes, setup instructions, and architecture details, see:

`PROJECT_DOCUMENTATION.md`
