# MessBuddy Project Documentation

## 1. Overview

MessBuddy is a role-based campus meal platform that helps students discover mess menus and helps vendors publish daily meal information. The application is implemented as a static multi-page web app using vanilla JavaScript and is backed by Supabase for authentication and cloud persistence.

The system is designed around two main roles:

- Student
- Vendor

Students consume menu information, ratings, and location data. Vendors create and manage daily menu cards for their mess.

## 2. Objectives

- Reduce confusion around daily mess menus
- Give students a single place to compare meal options
- Help vendors update menus quickly
- Improve transparency using ratings and location visibility
- Offer lightweight deployment without a heavy framework or build process

## 3. Architecture

## Frontend

- Multi-page application using HTML, CSS, and JavaScript
- No bundler or framework
- Shared browser-side data layer in `menu-data.js`
- Separate page scripts for login, student dashboard, vendor dashboard, and profile pages

## Backend Services

- Supabase Auth for sign-in and user session handling
- Supabase database for menu cards, ratings, and saved locations
- Browser localStorage as fallback when Supabase is unavailable

## PWA Layer

- `manifest.webmanifest` defines app identity and icons
- `pwa.js` registers the service worker and controls install prompt behavior
- `sw.js` supports offline-friendly behavior

## Mapping and Geolocation

- Student dashboard embeds Google Maps directions links
- Vendor dashboard uses OpenStreetMap and Leaflet
- Address search and reverse geocoding use Nominatim
- Browser geolocation can save live coordinates for student and vendor accounts

## 4. File Responsibilities

### Core entry pages

- `index.html`
  Redirects users to `welcome.html`.

- `welcome.html`
  Landing page introducing the product, main value proposition, and login CTA.

- `login.html`
  Role selection and authentication UI for vendor and student users.

### Styling

- `style.css`
  Shared or legacy general styling.

- `welcome.css`
  Landing page styling.

- `login.css`
  Login experience styling and animations.

- `style.css`
  Main student dashboard styling and shared student-facing layout rules.

- `vendor-dashboard.css`
  Vendor dashboard UI styles.

- `profile.css`
  Profile page styles.

- `menu-details.css`
  Menu details page styles.

### Script files

- `script.js`
  Landing page transitions and welcome-page interactions.

- `login.js`
  Handles role-based login, Supabase sign-in, Google OAuth, and redirect logic.

- `student-dashboard.js`
  Loads menus, applies filters, opens menu modal, rates menus, and manages student location.

- `vendor-dashboard.js`
  Handles menu CRUD, location management, presets, address suggestions, and vendor-only restrictions.

- `menu-data.js`
  Shared data access layer. Communicates with Supabase and localStorage fallback.

- `pwa.js`
  Registers the service worker and manages install buttons.

- `sw.js`
  Service worker implementation for app caching/offline support.

- `profile.js`
  Profile page logic.

- `menu-details.js`
  Menu details page logic.

### Data and SQL

- `supabase/vendor_mess_cards_hardening.sql`
  Adds constraints and indexing for vendor menu cards.

- `supabase/menu_ratings.sql`
  Creates ratings table, indexes, triggers, and RLS policies.

- `supabase/user_locations.sql`
  Creates user location table, indexes, triggers, and RLS policies.

## 5. Authentication Design

Authentication is handled in the browser using the Supabase JS SDK.

### Supported login methods

- Email and password
- Google OAuth

### Role handling

The app uses a role marker stored in:

- `user_metadata.role`
- local storage key: `messplans_role`

Role routing behavior:

- Students are redirected to `student-dashboard.html`
- Vendors are redirected to `vendor-dashboard.html`
- If a user tries to sign in from the wrong role card, the app blocks access and asks them to use the correct login path

### Vendor identity rules

Vendor accounts also depend on a saved mess name in user metadata or persisted local state. This prevents one vendor account from acting as multiple messes.

## 6. Data Model

## 6.1 `vendor_mess_cards`

Expected fields used by the frontend:

- `id`
- `owner_id`
- `mess_name`
- `tier`
- `price`
- `rating`
- `timings`
- `crowd`
- `distance`
- `special`
- `menu_items`
- `vegetarian_only`
- `menu_date`
- `updated_at`

### Notes

- `menu_items` is treated as an array by the frontend
- a vendor can have only one menu per day after hardening
- location coordinates are encoded inside the `distance` field using a suffix like `[geo:lat,lng]`

## 6.2 `menu_ratings`

Stores one rating per user per menu.

Important rules:

- `rating` must be between 1 and 5
- unique key on `(menu_id, user_id)`
- row-level security ensures users can write only their own ratings

## 6.3 `user_locations`

Stores saved coordinates for each user and role.

Important rules:

- valid role values: `student`, `vendor`
- unique key on `(user_id, role)`
- row-level security ensures users can only access their own saved coordinates

## 7. Student Dashboard Behavior

The student dashboard supports:

- date-based menu viewing
- free-text search
- tier filtering
- price-range filtering
- vegetarian-only filtering
- saved location loading
- map directions
- per-menu rating submission

### Data loading flow

1. Validate that the current user is not a vendor.
2. Read saved student role and Supabase session.
3. Load user location if available.
4. Read filters from the UI.
5. Request menus through `window.messDataApi.listMenus(...)`.
6. Render grouped cards by tier.
7. Refresh menu data every 60 seconds.

### Rating flow

1. Student opens a menu modal.
2. Existing personal rating is fetched.
3. Student selects stars and submits.
4. Rating is upserted into `menu_ratings`.
5. Dashboard reloads and recalculates display ratings.

## 8. Vendor Dashboard Behavior

The vendor dashboard supports:

- mess identity locking
- one menu card per day
- edit/delete existing menu cards
- reuse older menu cards as presets
- address search and selection
- current-location capture
- map-based coordinate picking
- map-link parsing for coordinates

### Vendor menu save flow

1. Ensure vendor role is active.
2. Resolve or reuse mess name.
3. Read the form payload.
4. Validate required fields.
5. Upsert menu through `window.messDataApi.upsertMenu(...)`.
6. Persist vendor location if coordinates are present.
7. Reload vendor cards and dashboard stats.

### Location sources supported

- typed address with Nominatim suggestions
- map click through Leaflet
- browser geolocation
- pasted map URL with embedded coordinates

## 9. Shared Data Layer

`menu-data.js` is the main abstraction between the UI and persistence.

### Exposed API

- `toIsoDay`
- `listMenus`
- `listVendorMenus`
- `getMenuById`
- `upsertMenu`
- `deleteMenu`
- `getCurrentUser`
- `getMyMenuRating`
- `rateMenu`
- `getUserLocation`
- `saveUserLocation`

### Fallback strategy

If Supabase is unavailable:

- menus can be read from and written to localStorage
- the app returns `mode: "local"`
- UI components display storage mode where relevant

This allows the interface to remain usable even during cloud failures, although authentication-dependent features may still be limited.

## 10. Progressive Web App Support

PWA support is implemented using:

- `manifest.webmanifest`
- `pwa.js`
- `sw.js`

### Current manifest details

- App name: `MessBuddy`
- Start URL: `/welcome.html`
- Display mode: `standalone`
- Theme color: `#d3482f`

### Install behavior

- Install buttons remain hidden until the browser fires `beforeinstallprompt`
- If the prompt is not available, the app shows guidance to refresh and install manually

## 11. Security Considerations

### Present in current implementation

- Supabase browser client is used directly in the frontend
- row-level security scripts are provided for ratings and user locations
- role checks are enforced in the UI before entering dashboards

### Recommended improvements

- move Supabase keys and config into environment-driven deployment setup
- document and verify RLS for `vendor_mess_cards`
- add a schema file for the full `vendor_mess_cards` table
- avoid depending on user metadata alone for role trust in high-security deployments
- add explicit input sanitization review for all user-entered text fields

## 12. Setup Instructions

### Basic frontend run

Serve the repository with any static server and open:

- `welcome.html`
- or `index.html`

### Supabase configuration checklist

1. Create or reuse a Supabase project.
2. Ensure authentication is enabled for:
   - email/password
   - Google OAuth if needed
3. Configure allowed redirect URLs for local and deployed domains.
4. Create the `vendor_mess_cards` table expected by the frontend.
5. Run:
   - `supabase/vendor_mess_cards_hardening.sql`
   - `supabase/menu_ratings.sql`
   - `supabase/user_locations.sql`
6. Confirm row-level security policies are active.

## 13. Limitations

- Supabase URL and publishable key are hardcoded in frontend files
- There is no package-based dependency management in the repo
- Some third-party libraries are loaded from CDNs
- The exact SQL schema for `vendor_mess_cards` is not included in this repository
- Offline fallback is partial and focused mainly on menu data

## 14. Future Enhancements

- Extract configuration into environment variables
- Add admin panel and moderation workflows
- Add order booking or meal reservation support
- Add analytics for popular menus and vendor performance
- Add automated testing
- Add a single consolidated design system or shared component styling layer

## 15. Summary

MessBuddy is a static, role-based web platform for campus mess communication. Its strongest implementation areas are simple deployment, dashboard-based workflows, Supabase-backed ratings and location storage, and vendor self-service menu publishing. The repository is a solid frontend-first prototype and can be improved further with clearer schema documentation, environment-driven configuration, and automated tests.
