# CampusPulse — Campus Events & Hackathon Hub

**CampusPulse** is a centralized platform designed for college campuses to discover, organize, and participate in campus events, technical symposiums, and hackathons.

## Purpose & Goals
- Provide students with a real-time feed of upcoming campus events and hackathons without requiring login.
- Enable authorized campus administrators to create, manage, and promote events securely.
- Simplify registrations, team formations, and notifications for attendees.
- Serve as a production-grade, full-stack portfolio project built with clean software architecture principles.

---

## Technology Stack

### Backend
- **Language**: Java 21 (LTS)
- **Framework**: Spring Boot 3.4.x (Spring Web, Spring Data JPA, Spring Security)
- **Security & Tokens**: Spring Security 6.x, JJWT 0.12.6 (HMAC-SHA256 stateless tokens), BCrypt password hashing
- **Build Tool**: Apache Maven (Maven Wrapper included)
- **Databases**:
  - **Local Development & Testing**: H2 (file-based persistence in `./data/campuspulse_db`)
  - **Production Target**: PostgreSQL 16+

### Frontend
- **Library**: React 18+ / Vite 8.x
- **Routing**: React Router v7
- **Styling**: Vanilla CSS Design System (dark theme, glassmorphism, micro-animations)
- **API Layer**: Fetch-based with automatic mock data fallback

---

## Architecture Overview
```text
[ React Frontend (Web Client) ]
              │  (REST APIs with JSON & Bearer JWT)
              ▼
[ Spring Boot Backend: SecurityFilterChain -> Controller -> Service -> Repository ]
              │  (JDBC / JPA / Hibernate)
              ▼
     [ H2 Dev / PostgreSQL Prod ]
```

---

## Role-Based Access Control (RBAC) Architecture

CampusPulse enforces a secure, three-tier role-based access model with strict server-side authorization:

1. **`ROLE_MAIN_ADMIN`**
   - Exactly one designated initial Main Admin (single Main Admin policy).
   - Approves or rejects campus coordinator requests.
   - Immediately revokes coordinator privileges at any time.
   - Publishes, rejects, and manages all events across all statuses.
2. **`ROLE_COORDINATOR`**
   - Represents student club presidents, department leads, and chapter organizers.
   - Can create events (which unconditionally start in `PENDING_REVIEW`).
   - Can update and delete only events they created (enforced strictly via server-side principal ownership).
   - Significant edits to already published events automatically return the event to `PENDING_REVIEW` for re-approval.
   - Cannot publish their own events or approve coordinator requests.
3. **`ROLE_USER`**
   - Regular campus students and members.
   - Can register publicly (`POST /api/auth/register`) — public registration always assigns `ROLE_USER`.
   - Can submit a coordinator privileges request (`POST /api/coordinator-requests`) and monitor their request status (`GET /api/coordinator-requests/me`).
   - Cannot assign themselves privileged roles or manage events.
4. **Public Visitors (Unauthenticated)**
   - Can freely browse published, non-expired upcoming events (`GET /api/events`, `GET /api/events/{id}`).
   - Non-published events (`DRAFT`, `PENDING_REVIEW`, `REJECTED`) are strictly invisible to public visitors.

### Immediate Server-Side Revocation Guarantee

To ensure tokens cannot be abused after privilege changes:
- `JwtAuthenticationFilter` performs a live server-side lookup on every authenticated request.
- The effective role and `enabled` status are resolved directly from the fresh database entity rather than stale JWT claims.
- If a coordinator is revoked, their database role is immediately set to `ROLE_USER`. Their very next request is evaluated as `ROLE_USER` — even if they present an unexpired JWT generated before revocation.
- Disabled accounts (`enabled = false`) are rejected immediately, terminating API access in real time.

---

## Coordinator Request & Event Approval Lifecycles

### 1. Coordinator Request Lifecycle
```text
[ Regular User (ROLE_USER) ]
           │
           │ POST /api/coordinator-requests (single pending request enforced)
           ▼
     [ PENDING ]
        │      │
        │      └──────────────────────────┐
        │ POST /approve (Main Admin)      │ POST /reject (Main Admin)
        ▼                                 ▼
   [ APPROVED ]                      [ REJECTED ]
(User promoted to                   (User remains
 ROLE_COORDINATOR)                    ROLE_USER)
        │
        │ POST /api/admin/coordinators/{id}/revoke (Main Admin)
        ▼
   [ REVOKED ]
(User returned to ROLE_USER;
 immediate server-side revocation)
```

### 2. Event Approval Lifecycle
```text
[ Coordinator (ROLE_COORDINATOR) ]
           │
           │ POST /api/events (createdBy derived from Principal)
           ▼
   [ PENDING_REVIEW ] ◄────────────────────────────────────┐
        │      │                                            │
        │      └───────────────────────┐                    │ Significant coordinator
        │ POST /publish (Main Admin)   │ POST /reject       │ update to published event
        ▼                              ▼                    │
   [ PUBLISHED ]                  [ REJECTED ]              │
        │                                                   │
        └───────────────────────────────────────────────────┘
```
- **Expired Event Rule**: Events whose `startDateTime` has passed are excluded from the public upcoming events list (`GET /api/events`) but remain preserved in the database and accessible via direct lookup or administrative archive.

---

## REST API Specification

### Public Endpoints (No Authentication)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/api/health` | Uptime & container liveness health probe |
| **GET** | `/api/events` | List all published, non-expired upcoming events |
| **GET** | `/api/events/{id}` | Fetch individual event (only if published & viewable) |
| **POST** | `/api/auth/login` | Authenticate account and receive JWT access token |
| **POST** | `/api/auth/register` | Register new student account (always creates `ROLE_USER`) |

### Authenticated Account Endpoints (Any Logged-in User)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/api/auth/me` | Safe user profile, effective role, and coordinator request status |
| **POST** | `/api/coordinator-requests` | Submit coordinator privileges request (status `PENDING`) |
| **GET** | `/api/coordinator-requests/me`| Retrieve latest coordinator request status |

### Coordinator Endpoints (`ROLE_COORDINATOR` / `ROLE_MAIN_ADMIN`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/api/events/my` | List events created by the authenticated coordinator |
| **POST** | `/api/events` | Create new event submission (status forced to `PENDING_REVIEW`) |
| **PUT** | `/api/events/{id}` | Update own event (returns published events to `PENDING_REVIEW`) |
| **DELETE**| `/api/events/{id}` | Delete own event (ownership verified against Principal) |

### Main Admin Endpoints (`ROLE_MAIN_ADMIN`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/api/admin/coordinator-requests` | List coordinator requests (supports `?status=PENDING`) |
| **GET** | `/api/admin/coordinator-requests/{id}` | View detailed coordinator request with requester info |
| **POST** | `/api/admin/coordinator-requests/{id}/approve` | Approve request, elevating user to `ROLE_COORDINATOR` |
| **POST** | `/api/admin/coordinator-requests/{id}/reject` | Reject coordinator request (user remains `ROLE_USER`) |
| **GET** | `/api/admin/coordinators` | List all active campus coordinators |
| **POST** | `/api/admin/coordinators/{id}/revoke` | Revoke coordinator access immediately (reverts to `ROLE_USER`) |
| **GET** | `/api/admin/events` | View all events across all statuses (`PENDING_REVIEW`, etc.) |
| **POST** | `/api/admin/events/{id}/publish` | Publish an event submission to public visibility |
| **POST** | `/api/admin/events/{id}/reject` | Reject an event submission with administrative feedback note |
| **DELETE**| `/api/admin/events/{id}` | Delete any event |

---

## Environment Variables & Configuration

Configure these environment variables in your deployment environment:

| Variable | Description | Local Dev Default | Production Example |
| :--- | :--- | :--- | :--- |
| `CAMPUSPULSE_ADMIN_EMAIL` | Designated Main Admin email for initial bootstrap | *(Empty)* | `admin@campuspulse.edu` |
| `CAMPUSPULSE_ADMIN_PASSWORD` | Designated Main Admin password for initial bootstrap | *(Empty)* | Strong unique password |
| `PORT` | Server listening port (auto-assigned by host) | `8080` | `10000` |
| `SPRING_PROFILES_ACTIVE` | Active Spring profile (`default` for H2, `postgres` for Prod) | `default` | `postgres` |
| `SPRING_DATASOURCE_URL` | PostgreSQL JDBC connection URL | H2 file database | `jdbc:postgresql://postgres.internal:5432/campuspulse_db` |
| `SPRING_DATASOURCE_USERNAME` | PostgreSQL database username | `sa` | `app_user` |
| `SPRING_DATASOURCE_PASSWORD` | PostgreSQL database password | *(Empty)* | Secure DB password |
| `JWT_SECRET` | 256-bit+ HMAC-SHA signing secret key | Development key | High-entropy 64+ char random string |
| `JWT_EXPIRATION_MS` | JWT validity duration in milliseconds | `86400000` (24h) | `86400000` |
| `CORS_ALLOWED_ORIGINS` | Permitted frontend origins (comma-separated) | `http://localhost:5173` | `https://campuspulse.onrender.com` |

---

## Main Admin Bootstrap Procedure

Public administrator registration is intentionally disabled. Initial Main Admin setup is safe, server-side, and idempotent:

1. **Configure Environment Variables:**
   - **PowerShell (Windows):**
     ```powershell
     $env:CAMPUSPULSE_ADMIN_EMAIL="admin@campuspulse.edu"
     $env:CAMPUSPULSE_ADMIN_PASSWORD="SecureAdminPassword!2026"
     ```
   - **Bash / Linux / Cloud Host:**
     ```bash
     export CAMPUSPULSE_ADMIN_EMAIL="admin@campuspulse.edu"
     export CAMPUSPULSE_ADMIN_PASSWORD="SecureAdminPassword!2026"
     ```
2. **Launch Application:**
   On startup, `AdminBootstrapRunner` checks if a designated Main Admin already exists:
   - If none exists, it hashes the password with BCrypt and provisions the initial Main Admin.
   - If a Main Admin already exists, bootstrap safely skips to preserve existing credentials.
   - It will **never** silently promote an existing ordinary account.
   - Passwords and secrets are **never** logged to application logs.

---

## Database Migration & PostgreSQL Setup

For PostgreSQL production deployment:
1. Provision a PostgreSQL 12+ database.
2. Execute the idempotent schema script [`schema-postgres.sql`](file:///c:/Users/Hp/OneDrive/Desktop/Campus_pulse/backend/src/main/resources/schema-postgres.sql).
3. The script creates tables `admins`, `events`, `coordinator_requests`, and `audit_logs` with proper indexes, constraints, and cascade settings.
4. In production, configure `spring.jpa.hibernate.ddl-auto=update` or `validate`. Never use `create` or `create-drop` in production.

---

## Running Backend Tests

Run all unit, repository, service, and security integration tests using Maven Wrapper:

```powershell
cd backend
.\mvnw.cmd test
```

**Verified Test Results:**
- **Total Tests Run**: 166
- **Passed**: 163
- **Failures**: 0
- **Errors**: 0
- **Skipped**: 3 (Live remote PostgreSQL tests conditionally skipped when local Docker/remote PostgreSQL environment variable `POSTGRES_TEST_ENABLED` is omitted)

---

## Testing with Postman / cURL

### 1. Public Event Discovery (No Auth Needed)
```http
GET http://localhost:8080/api/events
Accept: application/json
```
**Response (200 OK):**
```json
[
  {
    "id": 1,
    "title": "Spring Hackathon 2026",
    "eventType": "HACKATHON",
    "status": "PUBLISHED"
  }
]
```

### 2. Admin Login
```http
POST http://localhost:8080/api/auth/login
Content-Type: application/json

{
  "email": "admin@campuspulse.edu",
  "password": "SecureAdminPassword!2026"
}
```
**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType": "Bearer",
  "expiresIn": 86400000,
  "email": "admin@campuspulse.edu",
  "role": "ADMIN"
}
```

### 3. Check Current Admin Profile (`/api/auth/me`)
```http
GET http://localhost:8080/api/auth/me
Authorization: Bearer <PASTE_TOKEN_HERE>
```
**Response (200 OK):**
```json
{
  "id": 1,
  "email": "admin@campuspulse.edu",
  "role": "ADMIN",
  "createdAt": "2026-10-10T22:50:00"
}
```

### 4. Create an Event (Admin Only)
```http
POST http://localhost:8080/api/events
Authorization: Bearer <PASTE_TOKEN_HERE>
Content-Type: application/json

{
  "title": "DevOps Bootcamp 2026",
  "description": "Intensive hands-on workshop on CI/CD and Docker.",
  "eventType": "WORKSHOP",
  "status": "PUBLISHED",
  "location": "Lab 304",
  "startDateTime": "2026-11-20T10:00:00",
  "endDateTime": "2026-11-20T17:00:00",
  "registrationDeadline": "2026-11-18T23:59:59",
  "maxCapacity": 60,
  "organizerName": "Cloud Club",
  "contactEmail": "cloud@college.edu",
  "whatsappNumber": "+919876543210",
  "bannerUrl": "https://example.com/banner.png"
}
```
**Response (201 CREATED):** Returns newly created event details. Requests without a valid Bearer token will be rejected with `401 Unauthorized`.

---

## Running Automated Tests

Run the full backend test suite:
```powershell
.\mvnw.cmd test
```
All 137 tests cover entity validation, repository queries, password hashing, JWT generation/parsing, web controllers, filter chains, bootstrap idempotency, safe profiles, exception handling, and CORS rules.

---

## Project Status
- **Current Phase**: Phase 6, Part 2 Completed — Cloud Deployment & Live Verification
- **Status**: Full-stack platform with production-hardened Spring Boot backend (142 tests total, 140 passing, 0 failures, 2 live-PG integration tests conditionally enabled), robust React frontend (53 tests passing across 9 test suites, production Vite build clean), managed PostgreSQL readiness, dynamic port binding (`$PORT`), health check probe (`/api/health`), containerization (`Dockerfile` for backend & frontend), and automated Infrastructure-as-Code blueprint (`render.yaml`).

---

## Running the Application

### 1. Running the Spring Boot Backend

#### Prerequisites:
- Java 21 (LTS)
- Maven (or use included `.\mvnw.cmd` wrapper)

#### Set Admin Bootstrap Credentials (Optional for local test admin):
**PowerShell:**
```powershell
$env:ADMIN_BOOTSTRAP_EMAIL="admin@campuspulse.edu"
$env:ADMIN_BOOTSTRAP_PASSWORD="SecureAdminPassword!2026"
```

**Bash / Linux / macOS:**
```bash
export ADMIN_BOOTSTRAP_EMAIL="admin@campuspulse.edu"
export ADMIN_BOOTSTRAP_PASSWORD="SecureAdminPassword!2026"
```

#### Start Backend:
```powershell
cd backend
.\mvnw.cmd spring-boot:run
```
Or with inline arguments:
```powershell
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.arguments=--app.admin.bootstrap.email=admin@campuspulse.edu --app.admin.bootstrap.password=SecureAdminPassword!2026"
```
The backend starts on `http://localhost:8080`.

---

### 2. Running with PostgreSQL (Local or Staging)

#### Option A: Running PostgreSQL via Docker (Recommended)
1. Start a local PostgreSQL 16 container:
   ```powershell
   docker run --name campuspulse-postgres -e POSTGRES_DB=campuspulse_db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16-alpine
   ```
2. Run the backend with the `postgres` profile:
   ```powershell
   cd backend
   $env:SPRING_PROFILES_ACTIVE="postgres"
   $env:DB_PASSWORD="postgres"
   $env:ADMIN_BOOTSTRAP_EMAIL="admin@campuspulse.edu"
   $env:ADMIN_BOOTSTRAP_PASSWORD="SecureAdminPassword!2026"
   .\mvnw.cmd spring-boot:run
   ```
   Or using single command-line arguments:
   ```powershell
   .\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=postgres "-Dspring-boot.run.arguments=--spring.datasource.password=postgres --app.admin.bootstrap.email=admin@campuspulse.edu --app.admin.bootstrap.password=SecureAdminPassword!2026"
   ```

#### Option B: Running with Native Windows PostgreSQL
1. Install PostgreSQL 16+ from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/).
2. Open `psql` or pgAdmin 4:
   ```sql
   CREATE DATABASE campuspulse_db;
   ```
3. Set your local environment variables in PowerShell and launch:
   ```powershell
   $env:SPRING_PROFILES_ACTIVE="postgres"
   $env:DB_USER="postgres"
   $env:DB_PASSWORD="your_postgres_password"
   .\mvnw.cmd spring-boot:run
   ```

---

### 3. Running the React Frontend

#### Prerequisites:
- Node.js 18+ and npm

#### Start Frontend Dev Server:
```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```
The frontend dev server launches at `http://localhost:5173/`.  
It automatically connects to the backend at `http://localhost:8080/api`.  
If the backend is not yet started, public event browsing falls back to mock event data automatically.

#### Production Build:
```powershell
cd frontend
npm.cmd run build
```
Generates optimized static assets in `frontend/dist/`.

---

## Running Automated Tests

### Backend Tests (JUnit 5 + Spring Boot Test)
```powershell
cd backend
.\mvnw.cmd test
```
**Results:** 141 tests total (139 passed, 0 failures, 2 conditionally skipped awaiting live PostgreSQL instance) across:
- `CampusPulseBackendApplicationTests`
- `EventEntityTest`, `AdminEntityTest`
- `EventRepositoryTest`, `AdminRepositoryTest`
- `EventServiceTest`, `AuthServiceTest`
- `EventControllerTest`, `AuthControllerTest`
- `SecurityFilterChainIntegrationTest`, `JwtTokenProviderTest`
- `AdminBootstrapRunnerTest`
- `EventCreateRequestValidationTest`
- `GlobalExceptionHandlerTest`
- `PostgresProfileConfigurationTest`
- `PostgresIntegrationTest` (runs against live PostgreSQL when `POSTGRES_TEST_ENABLED=true`)

### Frontend Tests (Vitest + React Testing Library + jsdom)
```powershell
cd frontend
npm.cmd test
```
**Results:** 53 tests passed (0 failures) across 9 test suites:
- `api.test.js`: API client methods, Bearer authorization, 401 handling, DTO mapping, error response parsing (13 tests).
- `AuthContext.test.jsx`: Authentication context, token persistence, login/logout state, session verification via `GET /api/auth/me` (5 tests).
- `ProtectedRoute.test.jsx`: Client-side route protection, redirection to login for unauthenticated visitors (2 tests).
- `AdminLoginPage.test.jsx`: Admin login form rendering, email/password validation, credential submission without logging, error handling (5 tests).
- `AdminEventFormPage.test.jsx`: Event CRUD form, validation rules, date range constraints (`endDateTime > startDateTime`, `registrationDeadline <= startDateTime`), create (`POST`) and update (`PUT`) flows, 400 validation error mapping, 500 server error alerts, network failure handling (9 tests).
- `AdminDashboardPage.test.jsx`: Admin metrics, event table, search/filter, delete confirmation modal flow (5 tests).
- `HomePage.test.jsx`: Hero rendering, live card listings, search by title, category chips filtering, empty state, mock fallback alert, retry on error (6 tests).
- `EventDetailPage.test.jsx`: Full event details rendering, date range, location, capacity, organizer contact, safe WhatsApp links (4 tests).
- `Navbar.test.jsx`: Public nav links, mobile drawer menu toggle, admin state rendering, logout session clearing (4 tests).

---

## Complete User Flows

### 1. Public Event Browsing (No Login Required)
1. Navigate to `http://localhost:5173/`.
2. Browse upcoming events, search by title/location, filter by event type tags (Hackathons, Workshops, Seminars, etc.).
3. Click any event card to view the full details page (`/events/:id`).
4. External contact links (email, WhatsApp) open safely in new tabs with `rel="noopener noreferrer"`.

### 2. Administrator Login
1. Click the **Admin** link in the navigation bar or visit `http://localhost:5173/admin/login`.
2. Enter the administrator credentials bootstrapped on startup (e.g., `admin@campuspulse.edu` / `SecureAdminPassword!2026`).
3. Client validates inputs. On submission, `POST /api/auth/login` returns a signed JWT.
4. Token is stored and verified via `GET /api/auth/me`, redirecting the admin to `/admin/dashboard`.

### 3. Create an Event
1. In the admin dashboard, click **+ Create Event** (or **New Event** in the header).
2. Complete the form matching `EventCreateRequest` DTO fields:
   - Event Title (max 150 chars)
   - Category (`HACKATHON`, `WORKSHOP`, `SEMINAR`, `TECHNICAL`, `CULTURAL`, `GUEST_LECTURE`)
   - Publication Status (`DRAFT`, `PUBLISHED`, `ONGOING`, `COMPLETED`, `CANCELLED`)
   - Description & Agenda
   - Venue Location
   - Start Date & Time
   - End Date & Time (validated: must be after start time)
   - Registration Deadline (validated: must not be after start time)
   - Max Capacity (optional positive integer)
   - Organizer Name & Contact Email
   - WhatsApp Number & Banner URL (optional)
3. Submit the form. `POST /api/events` creates the event on the backend.
4. On success, the admin is redirected to the dashboard with a success notification banner.

### 4. Edit an Event
1. In the admin dashboard table, locate an event and click the **Edit** (pencil) icon.
2. The form pre-populates existing data fetched via `GET /api/events/:id`.
3. Modify fields and click **Update Event**.
4. `PUT /api/events/:id` updates the event on the backend.

### 5. Delete an Event
1. In the admin dashboard table, click the **Delete** (trash) icon.
2. A confirmation modal opens warning that deletion is permanent.
3. Click **Delete Event**.
4. `DELETE /api/events/:id` removes the event on the backend with Bearer authorization.
5. The table updates only after receiving backend confirmation.

### 6. Logout
1. Click **Logout** in the admin header or navigation bar.
2. Token is purged from storage and state is cleared.
3. Accessing protected admin URLs (`/admin/dashboard`, `/admin/events/new`, etc.) redirects to `/admin/login`.

---

## Security & Architectural Notes

### Token Storage (Bearer JWT vs. HttpOnly Cookies)
- **Current Architecture**: The Spring Boot backend uses stateless Bearer JWTs returned in JSON payloads (`AdminLoginResponse`) and expects the `Authorization: Bearer <token>` header for protected endpoints (`/api/auth/me`, `/api/events`).
- **Storage Decision**: The frontend stores the Bearer token in `localStorage` to persist administrator sessions across page refreshes.
- **Security Assessment & XSS Mitigation**:
  - `localStorage` is accessible to scripts executing within the document origin. If user-generated scripts were permitted (XSS), tokens could be exposed.
  - To mitigate this risk, all content is strictly sanitized and rendered via React's standard JSX escaping mechanisms.
  - Client-side route guards are a user-experience feature; backend Spring Security filters remain the authoritative security boundary.
  - **Production Recommendation**: For production enterprise deployments, the backend authentication architecture can be transitioned to set an `HttpOnly`, `SameSite=Strict`, `Secure` session cookie to eliminate token accessibility from JavaScript entirely.

---

## Cloud Deployment Guide (Phase 6, Part 2)

CampusPulse is engineered for turnkey cloud deployment with zero code changes across multiple cloud infrastructure providers.

### Architecture Topology
```text
┌─────────────────────────────────┐
│     Client Browsers             │
└──────────────┬──────────────────┘
               │ HTTPS (Port 443)
               ▼
┌─────────────────────────────────┐
│ React Frontend (Static SPA Host)│
│ Providers: Vercel / Render /    │
│            Netlify / Cloudflare │
└──────────────┬──────────────────┘
               │ REST APIs + Bearer JWT (HTTPS)
               │ VITE_API_BASE_URL
               ▼
┌─────────────────────────────────┐
│ Spring Boot 3.x Backend Service │
│ Runtime: Java 21 / Docker       │
│ Providers: Render / Railway /   │
│            Fly.io / AWS ECS     │
└──────────────┬──────────────────┘
               │ JDBC / TLS (Port 5432)
               │ SPRING_DATASOURCE_URL
               ▼
┌─────────────────────────────────┐
│ Managed PostgreSQL 16+ Database │
│ Providers: Neon / Supabase /    │
│            Render PostgreSQL    │
└─────────────────────────────────┘
```

---

### Step 1: Managed PostgreSQL Provisioning
1. **Recommended Managed Providers**:
   - **Neon Serverless PostgreSQL (Recommended)**: Free tier includes 0.5 GiB storage, automated continuous backup/point-in-time recovery, autoscaling, and connection pooling.
   - **Render Managed PostgreSQL**: 1 GB storage free tier, internal private networking if backend also runs on Render.
   - **Supabase PostgreSQL**: 500 MB storage free tier, direct 5432 and pooled 6543 connections.
2. **Schema Initialization**:
   - For fresh production databases, execute [`schema-postgres.sql`](file:///backend/src/main/resources/schema-postgres.sql) in the provider SQL console to establish tables (`admins`, `events`) and discovery indexes.
   - Alternatively, start the backend with `SPRING_JPA_HIBERNATE_DDL_AUTO=update` on first boot, then switch to `validate` for strict production hardening.
3. **Database Limitations & Considerations**:
   - **Serverless Scale-to-Zero**: Neon and Supabase free tiers pause compute after periods of inactivity. Initial wakeup latency is typically ~500ms–2s.
   - **Connection Limits**: Free-tier PostgreSQL instances typically cap concurrent connections at 20–50. CampusPulse configures HikariCP with `DB_POOL_MAX_SIZE=15` and `DB_POOL_MIN_IDLE=5` to prevent exhausting connection limits.

---

### Step 2: Spring Boot Backend Deployment
1. **Option A — Turnkey Render Blueprint (`render.yaml`)**:
   - Connect your GitHub repository to [Render](https://render.com).
   - Create a **New Blueprint Instance** pointing to `render.yaml`.
   - Render automatically provisions the PostgreSQL database, builds the Java 21 backend service, and attaches the frontend static site with internal networking.
2. **Option B — Docker Container**:
   - Build container: `docker build -t campuspulse-backend backend/`
   - Run container:
     ```bash
     docker run -d -p 8080:8080 \
       -e SPRING_PROFILES_ACTIVE=prod \
       -e SPRING_DATASOURCE_URL=jdbc:postgresql://<DB_HOST>:5432/<DB_NAME>?sslmode=require \
       -e SPRING_DATASOURCE_USERNAME=<DB_USER> \
       -e SPRING_DATASOURCE_PASSWORD=<DB_PASSWORD> \
       -e JWT_SECRET=<SECURE_BASE64_KEY> \
       -e CORS_ALLOWED_ORIGINS=https://campuspulse-frontend.onrender.com \
       -e ADMIN_BOOTSTRAP_EMAIL=admin@campuspulse.edu \
       -e ADMIN_BOOTSTRAP_PASSWORD=StrongBootstrapPassword123! \
       campuspulse-backend
     ```
3. **Option C — Native Jar on PaaS (Railway / Render / Fly.io)**:
   - Build Command: `./mvnw clean package -DskipTests`
   - Start Command: `java -Dspring.profiles.active=prod -jar target/campuspulse-backend-0.0.1-SNAPSHOT.jar`
   - Health Check Path: `/api/health` (returns `{"status":"UP"}`)
4. **Backend Limitations & Considerations**:
   - **Cold Starts**: Render free-tier web services spin down after 15 minutes of zero traffic. Initial cold starts take 45–60 seconds. Keep-alive pings to `/api/health` can mitigate this during active demonstration windows.

---

### Step 3: React Frontend Deployment
1. **Static Hosting Providers**:
   - **Vercel**: Connect repo, set root directory to `frontend`. Configuration file [`vercel.json`](file:///frontend/vercel.json) automatically routes all paths to `/index.html`.
   - **Render Static Site / Netlify**: Connect repo, root directory `frontend`, build command `npm install && npm run build`, publish directory `dist`. Pre-configured [`_redirects`](file:///frontend/public/_redirects) prevents 404s on page refresh.
2. **Build-Time Environment Variables**:
   - `VITE_API_BASE_URL`: Set to your deployed backend URL, e.g. `https://campuspulse-backend.onrender.com/api` (or `https://campuspulse-backend.onrender.com`).
   - *Security Note*: `VITE_` variables are baked into browser client bundles. Never place database passwords or JWT signing keys here!

---

## Live End-to-End Verification Runbook (Task 5)

The platform includes an automated PowerShell verification script: [`verify_live_api.ps1`](file:///backend/verify_live_api.ps1).

### Automated Verification Script
Run against local, staging, or production backend:
```powershell
# Set backend host (defaults to http://localhost:8080)
.\backend\verify_live_api.ps1
```

### Manual Verification Checklist (12 Verification Criteria)
| # | Verification Check | Procedure & Expected Result |
| :--- | :--- | :--- |
| 1 | **Public Homepage (HTTPS)** | Visit frontend URL. Hero section, event cards, category filters render without errors. |
| 2 | **Event List & Detail APIs** | `GET /api/events` returns HTTP 200 with JSON event array; `GET /api/events/{id}` returns single event object. |
| 3 | **Search & Category Filtering** | Type title in search input; select category chips (`HACKATHON`, `WORKSHOP`). Client filters in real-time. |
| 4 | **Admin Login (Valid)** | `POST /api/auth/login` with bootstrapped email/password returns HTTP 200 with JWT token and `ROLE_ADMIN`. |
| 5 | **Admin Login (Invalid)** | `POST /api/auth/login` with bad password returns HTTP 401 Unauthorized with clean error payload. |
| 6 | **Admin CRUD Operations** | Authenticated `POST /api/events` creates event (201); `PUT /api/events/{id}` updates event (200); `DELETE /api/events/{id}` deletes event (204). |
| 7 | **Public Visibility of Changes** | Public visitors refresh home feed and observe newly created/edited events without authentication. |
| 8 | **Protected Write Rejection** | `POST /api/events` without Bearer token returns HTTP 401 Unauthorized. |
| 9 | **PostgreSQL Connectivity** | Backend logs show `HikariPool-1 - Start completed` and queries execute without SQL errors. |
| 10 | **Data Persistence** | Restarting the backend service does not lose created events; records remain stored in PostgreSQL. |
| 11 | **CORS Enforcement** | Preflight `OPTIONS /api/events` from configured frontend domain returns `Access-Control-Allow-Origin`. Unauthorized origins are denied. |
| 12 | **Safe Error Handling** | Invalid inputs return structured HTTP 400 `ErrorResponse` without exposing stack traces, database schemas, or secrets. |
| 13 | **Happening Today API & Page** | `GET /api/events/today` returns published events active today; `/today` renders Ongoing, Upcoming, and Completed sections with live 30s recalculation. |

---

## Frontend Architecture & Multi-Role Pages (Part 2)

CampusPulse provides three integrated user experiences across desktop, tablet, and mobile:

### 1. Public Visitor Experience (No Login Required)
- **`/` (Home / Events)**: Real-time discovery feed of published, upcoming campus events and hackathons with search, category filters, and empty/error states.
- **`/today` (Happening Today)**: Dedicated public real-time hub categorizing the current calendar day's schedule into **"Ongoing Now"** (with live indicator), **"Upcoming Today"** (sorted chronologically by start time), and **"Completed Today"**. Automatically recalculates classifications every 30 seconds without full page reloads, seamlessly handles events crossing midnight and multi-day spans, and communicates strictly with live backend data (no mock-data fallback).
- **`/events/:id` (Event Details)**: Complete schedule, venue, attendee limits, organizer contacts, and direct registration links opened safely (`target="_blank" rel="noopener noreferrer"`).
- **`/about`**: CampusPulse mission, community guidelines, and platform overview.

### 2. Regular Student Experience (`ROLE_USER`)
- **`/register`**: Student registration assigning strictly `ROLE_USER` (no role selector). Client and server validation.
- **`/login`**: Universal login with smart role-based redirection.
- **`/coordinator/request`**: Application form for student club leads to request coordinator privileges with club name and responsibilities. Single pending application enforced.
- **`/coordinator/status`**: Dynamic status tracking for `PENDING`, `APPROVED`, `REJECTED`, and `REVOKED` states, including admin review notes and resubmission options.

### 3. Approved Coordinator Experience (`ROLE_COORDINATOR`)
- **`/coordinator/dashboard`**: Control center showing live metrics (My Events, Pending, Published, Rejected), search/filtering, review notes for rejected submissions, and event deletion with confirmation modal.
- **`/coordinator/events/new`**: Submission form placing new events into `PENDING_REVIEW` for Main Admin approval.
- **`/coordinator/events/:id/edit`**: Event editing. Significant updates to published events automatically reset status to `PENDING_REVIEW`.

### 4. Main Admin Experience (`ROLE_MAIN_ADMIN`)
- **`/admin/dashboard`**: Unified control hub featuring an improved administrator layout, dedicated top navigation with public-site toggle, and three operational management tabs:
  - **Tab 1: All Events & Moderation**: Real-time moderation table. One-click publishing, rejection with optional review feedback note, edit any event, delete any event.
  - **Tab 2: Coordinator Requests**: Review queue for student organizer applications. One-click approval promoting user to `ROLE_COORDINATOR`, or rejection with review note.
  - **Tab 3: Active Coordinators**: Roster of active organizers with immediate privilege revocation returning users to `ROLE_USER`.
- **`/admin/events/new` & `/admin/events/:id/edit`**: Full administrative event management.

---

## Release Notes

### v1.1.0 — Happening Today & Admin Dashboard Enhancements
- **Public Happening Today Hub (`/today`)**:
  - Added dedicated public route and navigation item for current day discovery.
  - Three distinct sections: "Ongoing Now" (with live pulsating badge), "Upcoming Today" (sorted by start time), and "Completed Today".
  - Live status transitions every 30 seconds without requiring page reloads.
  - Correct midnight-crossing and multi-day event boundary handling.
  - Safe error and loading states with retry mechanism; zero mock data fallback.
- **Backend `GET /api/events/today` Endpoint**:
  - Exposes public read-only endpoint returning published events active on the current calendar day.
  - Zero database schema changes; fully backward-compatible with existing endpoints.
- **Admin Dashboard UI Improvements**:
  - Upgraded top navigation with dedicated admin control bar, quick-link to public site, user badge, and mobile drawer support.
  - Streamlined operational tabs and action buttons for event moderation and coordinator workflows.

---

## Test Verification Summary

### Backend Tests (JUnit 5, Mockito, Spring Boot Test)
```bash
cd backend
.\mvnw.cmd test
```
- **Total Tests Run**: 168
- **Passed**: 165
- **Failures**: 0
- **Errors**: 0
- **Skipped**: 3 (conditionally skipped when remote cloud PostgreSQL database is offline)
- **Status**: `BUILD SUCCESS`

### Frontend Tests (Vitest, React Testing Library, jsdom)
```bash
cd frontend
npm.cmd test
```
- **Test Files**: 11 passed (11)
- **Total Tests Run**: 71 passed (71)
- **Failures**: 0
- **Status**: `PASS`

### Frontend Production Build (Vite)
```bash
cd frontend
npm.cmd run build
```
- **Status**: `Built in ~200ms` (0 errors, 50 modules transformed into production assets).

---

## Known Limitations & Production Notes

1. **Free Tier Cold Starts**: Render and other free-tier PaaS instances sleep after inactivity. First requests after idle take ~45–60 seconds.
2. **JWT Storage**: Bearer tokens are stored in `localStorage` for stateless SPA operation. Enterprise deployments should migrate to `HttpOnly`, `SameSite=Strict` cookies.
3. **Banner Uploads**: Posters use external HTTPS URLs. Future releases can incorporate AWS S3 / Cloudflare R2 direct uploads.



