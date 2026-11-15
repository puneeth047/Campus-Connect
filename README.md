# CampusConnect – Discover. Participate. Experience.

A full-stack campus event discovery and club management mini-app for The National Institute of Engineering, Mysuru. Students can discover events through poster-led cards, review fees and event details, and register. Admins can publish events and review registrations.

## Features

### Student experience
- Responsive event discovery homepage with event poster images.
- Search by event title, club or description.
- Filter by category and free/paid events.
- Event cards show date, time, venue, entry fee, registrations and seats remaining.
- Event registration page keeps the selected event poster and details visible beside the form.
- Success confirmation with registration ID.
- Prevents duplicate email registrations and registrations after capacity is reached.

### Admin experience
- Create events with poster image URL, category, date, time, venue, entry fee and seat capacity.
- Live poster preview while entering the image URL.
- Dashboard summary for events, registrations and paid events.
- View published events and recent student registrations.
- Delete events (associated registrations are deleted through the database foreign key).

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Database | PostgreSQL 16 |
| Containers | Docker, Docker Compose |
| Version control | Git and GitHub |

## Run with Docker

1. Install Docker Desktop and start Docker.
2. Extract this ZIP and open a terminal in the `campus-event-app` folder.
3. Start the app:

```bash
docker compose up --build
```

4. Open:

| Service | URL |
|---|---|
| Student website | http://localhost:3000 |
| Admin dashboard | http://localhost:3000/admin |
| API health | http://localhost:5000/api/health |

The API automatically creates the database tables and adds the new event fields to an existing database. Existing events and registrations are retained.

### Add sample events

In a second terminal:

```bash
docker compose exec api npm run seed
```

The seed script inserts sample events only when an event with the same title does not already exist. It does not clear your database.

### Stop the app

```bash
docker compose down
```

To also delete the local PostgreSQL data volume (this permanently removes local database data):

```bash
docker compose down -v
```

## Add an event from Admin

1. Open http://localhost:3000/admin.
2. Enter the event title and description.
3. Upload a JPG, PNG or WebP poster (maximum 2 MB), or paste a direct image URL. The poster preview updates automatically.
4. Choose a category, date, time and venue.
5. Set the entry fee (`0` means free) and seat capacity.
6. Click **Publish event**.

Uploaded posters are stored as data URLs in PostgreSQL; alternatively, you can store a direct image URL. Keep uploads at or below 2 MB. If no image is supplied or it fails to load, a default event image is shown.

## Project structure

```text
campus-event-app/
├── backend/
│   ├── src/
│   │   ├── config/db.js
│   │   ├── routes/events.js
│   │   ├── routes/registrations.js
│   │   ├── index.js
│   │   └── seed.js
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/EventCard.jsx
│   │   ├── pages/Home.jsx
│   │   ├── pages/Register.jsx
│   │   ├── pages/Admin.jsx
│   │   ├── App.jsx
│   │   └── index.css
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/events` | List events with registration counts |
| GET | `/api/events/:id` | Get one event |
| POST | `/api/events` | Create an event |
| PUT | `/api/events/:id` | Update an event |
| DELETE | `/api/events/:id` | Delete an event |
| GET | `/api/registrations` | List registrations for Admin |
| GET | `/api/registrations/event/:eventId` | List registrations for one event |
| POST | `/api/registrations` | Register a student |

## CDD / DevOps alignment

- Git feature branches and pull requests for team collaboration.
- Separate frontend, API and database containers.
- Docker Compose starts the full stack with one command.
- Responsive UI and student/admin user journeys.
- PostgreSQL-backed event and registration data.

**Project:** CSE 2026–27 · The National Institute of Engineering, Mysuru.


---

## Final visual refresh — November 2026

### Design changes in this delivery
- Rebuilt the student homepage around the approved CampusConnect hero composition.
- Added the uploaded NIE building photograph at `frontend/public/images/nie-campus.jpg`.
- Applied a dark Phthalo Green palette with mint/emerald accents, glass-like surfaces and modern typography.
- Updated the navigation, brand mark, hero headline, calls to action, feature rail, event discovery filters and event cards.
- Added a responsive layout for desktop, tablet and mobile widths.
- Updated page metadata, browser theme colour and title.
- Updated the registration poster display to use `object-fit: contain`, so the complete poster is visible without cropping.
- Restyled the existing Admin and Registration pages through shared theme tokens and global styling while retaining their existing API calls and flows.

### Existing functionality retained
- Event list retrieval from `GET /api/events`.
- Search, category and free/paid filtering on the homepage.
- Event registration through `POST /api/registrations`.
- Duplicate-email and capacity checks in the existing API.
- Admin event creation, poster preview/upload, event deletion, dashboard counts and recent registrations.
- PostgreSQL schema initialization and Docker Compose services.

### Still not implemented in this ZIP
The following were discussed as future differentiators but are **not** implemented by this delivery:
- Student/admin authentication and role-based authorization.
- QR ticket generation, ticket email delivery and organizer QR attendance scanner.
- My Registered Events / student profile page.
- Branch-wise analytics and advanced reporting.
- Payment gateway integration.
- Production deployment and cloud image storage.

### Important image note
The homepage hero uses the exact NIE building photo supplied in this conversation. The auditorium photo has not yet been supplied, so no auditorium/gallery image has been added.

### Run locally
From this folder:

```bash
docker compose up --build
```

- Student homepage: http://localhost:3000
- Admin dashboard: http://localhost:3000/admin
- API health: http://localhost:5000/api/health

Stop with `Ctrl+C`, then `docker compose down`. This keeps the PostgreSQL volume intact.


## QR tickets and attendance

- A successful registration creates a cryptographically random ticket token. Only its SHA-256 hash is stored in PostgreSQL.
- The student sees a QR ticket on the confirmation screen and can download it as a PNG.
- The QR contains an opaque token, not the student's name/email.
- If SMTP settings are configured, the same QR ticket is emailed to the student. Without SMTP settings, QR still works on the confirmation screen, but no email is sent.
- Students can look up bookings at `/my-events` using their registration email.
- Organizers open `/scanner`, choose the event, allow camera access and scan the student's QR. The API checks the ticket against the selected event and records one check-in only. Re-scans are reported as already checked in.
- Camera access requires HTTPS on a deployed site; localhost is allowed for development.

### Configure email delivery

Copy `backend/.env.example` to a root `.env` file beside `docker-compose.yml`, then enter SMTP credentials for a verified sender/domain. Do not commit real SMTP credentials or API keys to Git. Restart Compose after changing environment variables.

### Security and production readiness

The QR ticket token is unguessable and is stored hashed. However, this student-project build still needs administrator/organizer authentication and role-based authorization before public deployment. The current admin and scanner pages are not protected by a login system. Do not expose the API publicly until that access-control layer is implemented and tested.


## Fixing missing Node modules in Docker

Compose mounts `/app/node_modules` as an anonymous volume. If an older volume exists, it can hide dependencies installed in the newly built image. The Compose services now run `npm install` at startup so the mounted dependency folders are reconciled before Vite/Node starts.

After extracting this corrected ZIP, from the `campus-event-app` directory run:

```bash
docker compose down
docker compose up --build --force-recreate --renew-anon-volumes
```

This does **not** delete the named PostgreSQL data volume. Do not add `-v` to `docker compose down` unless you intentionally want to delete the local database data.

If npm cannot download packages, check internet access and run the same `docker compose up` command again after the connection is restored.
