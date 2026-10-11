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

## API & Security Endpoint Access Policy

All endpoints follow a strict, least-privilege security model enforced by `SecurityFilterChain`. All unrecognized routes are denied by default.

| HTTP Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/events` | **Public** | List all upcoming published events |
| **GET** | `/api/events/{id}` | **Public** | Retrieve details for a single event |
| **POST** | `/api/auth/login` | **Public** | Authenticate administrator & issue JWT |
| **GET** | `/api/auth/me` | **Admin (`ROLE_ADMIN`)** | Retrieve current administrator safe profile |
| **POST** | `/api/events` | **Admin (`ROLE_ADMIN`)** | Create a new campus event |
| **PUT** | `/api/events/{id}` | **Admin (`ROLE_ADMIN`)** | Update an existing campus event |
| **DELETE** | `/api/events/{id}` | **Admin (`ROLE_ADMIN`)** | Remove a campus event |
| **OPTIONS**| `/**` | **Public** | CORS preflight verification |
| **ALL** | `/h2-console/**` | **Dev Only** | Local development database console |
| **ALL** | *Any other route* | **Denied** | Denied by default (`anyRequest().denyAll()`) |

---

## Environment Variables & Configuration

Configure these environment variables in your local shell or production deployment orchestrator (Docker, Kubernetes, Cloud Run, Heroku):

| Variable | Description | Local Dev Default | Production Example |
| :--- | :--- | :--- | :--- |
| `JWT_SECRET` | 256-bit+ HMAC-SHA key for signing and verifying tokens | Built-in development key | High-entropy 64+ char random string |
| `JWT_EXPIRATION_MS` | Token validity duration in milliseconds | `86400000` (24 hours) | `86400000` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of permitted frontend origins | `http://localhost:5173,http://localhost:3000` | `https://campuspulse.edu,https://admin.campuspulse.edu` |
| `ADMIN_BOOTSTRAP_EMAIL` | Email for automatic initial admin creation on boot | *(Empty - bootstrap skipped)* | `admin@campuspulse.edu` |
| `ADMIN_BOOTSTRAP_PASSWORD` | Password for automatic initial admin creation | *(Empty - bootstrap skipped)* | Strong unique password |
| `DB_HOST` | PostgreSQL database host (prod profile) | `localhost` | `postgres-service.internal` |
| `DB_PORT` | PostgreSQL database port (prod profile) | `5432` | `5432` |
| `DB_NAME` | PostgreSQL database name (prod profile) | `campuspulse_db` | `campuspulse_prod` |
| `DB_USER` | PostgreSQL user (prod profile) | `postgres` | `app_user` |
| `DB_PASSWORD` | PostgreSQL password (prod profile) | *(Empty)* | Secure database password |

---

## Initial Administrator Bootstrap Procedure

Public admin self-registration is deliberately disabled for security. Initial administrator accounts are provisioned safely using environment variables:

1. **Set the environment variables before starting the application:**
   - **PowerShell (Windows):**
     ```powershell
     $env:ADMIN_BOOTSTRAP_EMAIL="admin@campuspulse.edu"
     $env:ADMIN_BOOTSTRAP_PASSWORD="SecureAdminPassword!2026"
     ```
   - **Bash / Linux / macOS:**
     ```bash
     export ADMIN_BOOTSTRAP_EMAIL="admin@campuspulse.edu"
     export ADMIN_BOOTSTRAP_PASSWORD="SecureAdminPassword!2026"
     ```
2. **Start the application:**
   ```powershell
   .\mvnw.cmd spring-boot:run
   ```
3. **Idempotent Execution:**
   - On startup, `AdminBootstrapRunner` checks if an account with `ADMIN_BOOTSTRAP_EMAIL` already exists.
   - If not found, it hashes the password with BCrypt and creates the admin with `ROLE_ADMIN`.
   - If the account already exists, the bootstrap process logs an informational message and skips execution without modifying existing records or passwords.
   - If the variables are blank or omitted, bootstrap is safely skipped.

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
All 87 tests cover entity validation, repository queries, password hashing, JWT generation/parsing, web controllers, filter chains, bootstrap idempotency, safe profiles, and CORS rules.

---

## Project Status
- **Current Phase**: Phase 4, Part 2 Completed — Admin Dashboard & Full Backend Integration
- **Status**: Full-stack platform with secure Spring Boot backend (87 tests passing) and feature-complete React frontend (36 tests passing) with public event discovery, admin authentication, JWT session management, protected routes, and complete Event CRUD operations.

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
The backend starts on `http://localhost:8080`.

---

### 2. Running the React Frontend

#### Prerequisites:
- Node.js 18+ and npm

#### Start Frontend Dev Server:
```powershell
cd frontend
npm install
npm run dev
```
The frontend dev server launches at `http://localhost:5173/`.  
It automatically connects to the backend at `http://localhost:8080/api`.  
If the backend is not yet started, public event browsing falls back to mock event data automatically.

#### Production Build:
```powershell
cd frontend
npm run build
```
Generates optimized static assets in `frontend/dist/`.

---

## Running Automated Tests

### Backend Tests (JUnit 5 + Spring Boot Test)
```powershell
cd backend
.\mvnw.cmd test
```
**Results:** 87 tests passed across entities, repositories, services, controllers, security filters, JWT handling, and bootstrap runners.

### Frontend Tests (Vitest + React Testing Library + jsdom)
```powershell
cd frontend
npm test
```
**Results:** 36 tests passed across 6 test suites:
- `api.test.js`: API client methods, Bearer authorization, 401 handling, DTO mapping, error response parsing.
- `AuthContext.test.jsx`: Authentication context, token persistence, login/logout state, session verification via `GET /api/auth/me`.
- `ProtectedRoute.test.jsx`: Client-side route protection, redirection to login for unauthenticated visitors.
- `AdminLoginPage.test.jsx`: Admin login form rendering, email/password validation, credential submission without logging, error handling.
- `AdminEventFormPage.test.jsx`: Event CRUD form, validation rules, date range constraints (`endDateTime > startDateTime`, `registrationDeadline <= startDateTime`), create (`POST`) and update (`PUT`) flows.
- `AdminDashboardPage.test.jsx`: Admin metrics, event table, search/filter, delete confirmation modal flow.

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

## Known Limitations & Production Tasks

1. **Database Persistence**: Currently configured for H2 local database. Transition to managed PostgreSQL 16+ using the provided `prod` profile when deploying.
2. **Production Admin Cookie Auth**: Transition from Bearer localStorage tokens to secure HttpOnly cookies if required by corporate compliance policies.
3. **Image Upload Service**: Banner URLs currently accept external URLs. A future enhancement could integrate an S3/Cloud Storage presigned URL upload pipeline.
4. **Student Self-Registration**: Public browsing and external registrations are supported; native student accounts and team formation can be added in a future phase.

