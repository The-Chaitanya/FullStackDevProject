# MessBuddy Diagrams

This file contains project diagrams for MessBuddy in Mermaid format so they render directly on GitHub and in Mermaid-compatible Markdown viewers.

## 1. System Architecture

```mermaid
flowchart LR
    Student[Student User]
    Vendor[Vendor User]

    subgraph Frontend[MessBuddy Frontend]
        Welcome[welcome.html]
        Login[login.html]
        StudentDash[student-dashboard.html]
        VendorDash[vendor-dashboard.html]
        Profile[profile.html]
        MenuDetails[menu-details.html]
        Shared[menu-data.js]
        PWA[pwa.js + sw.js + manifest.webmanifest]
        Local[(localStorage Fallback)]
    end

    subgraph Cloud[Cloud Services]
        Auth[Supabase Auth]
        DB[(Supabase Database)]
    end

    subgraph Maps[Location Services]
        Leaflet[Leaflet + OpenStreetMap]
        Nominatim[Nominatim Geocoding]
        GoogleMaps[Google Maps Embed / Directions]
        Geo[Browser Geolocation]
    end

    Student --> Welcome
    Vendor --> Welcome
    Welcome --> Login
    Login --> StudentDash
    Login --> VendorDash
    StudentDash --> Profile
    StudentDash --> MenuDetails
    VendorDash --> Profile

    Login --> Auth
    StudentDash --> Shared
    VendorDash --> Shared
    MenuDetails --> Shared
    Shared --> DB
    Shared --> Local

    StudentDash --> GoogleMaps
    StudentDash --> Geo
    VendorDash --> Leaflet
    VendorDash --> Nominatim
    VendorDash --> Geo

    Welcome --> PWA
    Login --> PWA
    StudentDash --> PWA
    VendorDash --> PWA
```

## 2. Role-Based Login Flow

```mermaid
flowchart TD
    Start([User opens app]) --> Welcome[Welcome Page]
    Welcome --> Login[Login Page]
    Login --> Choice{Choose role}
    Choice --> StudentChoice[Student Login]
    Choice --> VendorChoice[Vendor Login]

    StudentChoice --> AuthStudent[Supabase Authentication]
    VendorChoice --> AuthVendor[Supabase Authentication]

    AuthStudent --> StudentCheck{Role valid?}
    AuthVendor --> VendorCheck{Role valid?}

    StudentCheck -- Yes --> StudentDash[Student Dashboard]
    StudentCheck -- No --> StudentError[Show role mismatch message]

    VendorCheck -- Yes --> VendorDash[Vendor Dashboard]
    VendorCheck -- No --> VendorError[Show role mismatch message]

    StudentDash --> Profile[Profile Page]
    VendorDash --> Profile
```

## 3. Student User Flow

```mermaid
flowchart TD
    S0([Student logs in]) --> S1[Load student dashboard]
    S1 --> S2[Read saved role and session]
    S2 --> S3[Load saved student location]
    S3 --> S4[Fetch menus from menu-data.js]
    S4 --> S5[Show menus grouped by tier]

    S5 --> S6{Apply filters?}
    S6 -- Yes --> S7[Filter by search, tier, price, veg, date]
    S7 --> S5
    S6 -- No --> S8[Open menu card]

    S8 --> S9[View full menu details]
    S9 --> S10[Open map / directions]
    S9 --> S11[Submit rating]
    S11 --> S12[Save rating to menu_ratings]
    S12 --> S4
```

## 4. Vendor User Flow

```mermaid
flowchart TD
    V0([Vendor logs in]) --> V1[Load vendor dashboard]
    V1 --> V2[Resolve vendor role and mess name]
    V2 --> V3{Mess name already set?}
    V3 -- No --> V4[Save mess name]
    V3 -- Yes --> V5[Open menu form]
    V4 --> V5

    V5 --> V6[Enter date, tier, price, timings, crowd, items, special]
    V6 --> V7{Set location}
    V7 --> V8[Typed address with suggestions]
    V7 --> V9[Map picker]
    V7 --> V10[Current location]
    V7 --> V11[Map link parsing]

    V8 --> V12[Validate form]
    V9 --> V12
    V10 --> V12
    V11 --> V12

    V12 --> V13[Upsert daily menu in vendor_mess_cards]
    V13 --> V14[Save vendor coordinates in user_locations]
    V14 --> V15[Refresh vendor cards and stats]
    V15 --> V16{Edit/Delete/Reuse preset?}
    V16 -- Edit --> V5
    V16 -- Delete --> V17[Delete menu card]
    V16 -- Reuse preset --> V18[Load previous menu preset]
    V18 --> V5
```

## 5. Page Navigation Diagram

```mermaid
graph TD
    Index[index.html] --> Welcome[welcome.html]
    Welcome --> Login[login.html]
    Login --> StudentDash[student-dashboard.html]
    Login --> VendorDash[vendor-dashboard.html]
    StudentDash --> Profile[profile.html]
    VendorDash --> Profile
    StudentDash --> MenuDetails[menu-details.html]
```

## 6. Data Model / ER Diagram

```mermaid
erDiagram
    VENDOR_MESS_CARDS {
        uuid id PK
        uuid owner_id
        text mess_name
        text tier
        numeric price
        text timings
        text crowd
        text distance
        text special
        array menu_items
        boolean vegetarian_only
        date menu_date
        timestamptz updated_at
    }

    MENU_RATINGS {
        uuid id PK
        uuid menu_id FK
        uuid user_id
        numeric rating
        timestamptz created_at
        timestamptz updated_at
    }

    USER_LOCATIONS {
        uuid id PK
        uuid user_id
        text role
        double latitude
        double longitude
        timestamptz updated_at
    }

    VENDOR_MESS_CARDS ||--o{ MENU_RATINGS : receives
```

## 7. Data Access Flow

```mermaid
sequenceDiagram
    participant U as User
    participant P as Page Script
    participant API as menu-data.js
    participant SA as Supabase Auth
    participant DB as Supabase DB
    participant LS as localStorage

    U->>P: Open page / perform action
    P->>API: Request data or save change
    API->>SA: Get current user session
    API->>DB: Read or write cloud data
    DB-->>API: Data / status
    API-->>P: Normalized response
    P-->>U: Render UI update

    Note over API,LS: If cloud call fails, menu-data.js can fallback to localStorage for menu data
```

## 8. Deployment Diagram

```mermaid
flowchart LR
    Dev[Developer Repository] --> Host[Static Hosting Platform]
    Host --> Browser[User Browser]

    Browser --> HTML[HTML Pages]
    Browser --> CSS[CSS Assets]
    Browser --> JS[JavaScript Files]
    Browser --> PWA[PWA Assets]

    Browser --> Supabase[Supabase Auth + Database]
    Browser --> ExternalMaps[Maps / Geolocation Services]
```
