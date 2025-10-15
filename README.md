# PaperTrail: Thesis Management System (Environmental Science Department)

A full-stack web application for managing thesis workflows: submission, review, evaluations, notifications, and collaborative document editing.

## Features

- **Thesis Topic Management**: Students propose topics, advisers review and approve
- **Group Formation**: Students form groups, admins assign advisers, advisers confirm
- **Document Management**: Upload, version control, and review of thesis documents
- **Collaborative Editing**: Real-time collaborative document editing with commenting
- **Evaluation System**: Panel member evaluations and feedback
- **Defense Scheduling**: Automated scheduling with conflict detection
- **Notification System**: Real-time alerts for all workflow events

## Stack
- Frontend: React + TypeScript, Bootstrap 5, React Router
- Backend: Django 5 + DRF, JWT (SimpleJWT)
- Database: MySQL 8
- Storage: Django file storage (local dev), pluggable via Django Storages
- Containers: Docker + docker-compose

## Directory Structure
- `papertrail_frontend/` – React app
- `papertrail_backend/` – Django project + API app
- `docker-compose.yml` – Orchestration for MySQL, Django, React

## Quick Start (Docker)
1. Copy example envs and adjust if needed:
   - Backend
     ```bash
     cp papertrail_backend/.env.example papertrail_backend/.env
     ```
   - Frontend (optional; defaults to localhost backend)
     ```bash
     cp papertrail_frontend/.env.example papertrail_frontend/.env
     ```

2. Build and start services:
   ```bash
   docker compose up --build
   ```

3. Apply DB migrations (automatically run on container start). If needed, run manually:
   ```bash
   docker compose exec backend python manage.py migrate
   ```

4. Seed demo data (optional):
   ```bash
   docker compose exec backend python create_sample_data.py
   ```

5. Access the apps:
   - Backend API: http://localhost:8000/api/
   - Frontend: http://localhost:3000/

## Demo Accounts
After seeding (`create_sample_data.py`):
- Admin: `admin` / `admin123`
- Adviser: `adviser1` / `adviser123`
- Panel: `panel1` / `panel123`
- Student: `student1` / `student123`

## Collaborative Document Editing

PaperTrail now includes a real-time collaborative document editing feature that allows students and advisers to work together on thesis documents. Key features include:

### Real-Time Editing
- Multiple users can edit the same document simultaneously
- Changes are synchronized in real-time
- User cursors are visible to all collaborators

### Commenting System
- Inline comments on specific parts of the document
- Threaded discussions for each comment
- Comment types: General, Suggestion, Correction Required, Question
- Resolution tracking for completed feedback

### Version Control
- Automatic versioning with timestamps
- Ability to restore previous versions
- Version history tracking

### Workflow Integration
- Document status tracking (Draft, For Review, For Revision, Approved)
- Role-based actions (Students: Mark for Review, Advisers: Approve/Request Revisions)
- Notifications for all workflow events

### Access Control
- Students and advisers can access collaborative editor
- Panel members have read-only access during defense stage
- Document ownership and permissions enforced

## Backend Configuration
`papertrail_backend/papertrail_backend/settings.py` reads MySQL config from env:
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`
- `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`

JWT auth endpoints (`/api/auth/...`):
- `POST /api/auth/login/` (JWT obtain)
- `POST /api/auth/refresh/` (token refresh)
- `POST /api/auth/logout/` (blacklist refresh)
- `GET  /api/auth/me/` (current user)

Core resources:
- `/api/users/`
- `/api/student-groups/`
- `/api/thesis-topics/`
- `/api/document-types/`
- `/api/thesis-documents/`
- `/api/comments/`
- `/api/evaluations/`
- `/api/notifications/`
- `/api/defense-schedules/`

## Frontend Configuration
`papertrail_frontend/src/utils/api.ts` uses `REACT_APP_API_BASE` with fallback to `http://localhost:8000/api`.

Install dependencies locally (if not using Docker):
```bash
cd papertrail_frontend
npm install
npm start
```

## Notes
- File uploads are saved under `papertrail_backend/media/` (mounted as a Docker volume). Configure cloud storage by adding Django Storages if desired.
- The seed script creates in-memory files for documents to avoid file-not-found errors.
- Bootstrap CSS is imported in `papertrail_frontend/src/index.tsx`.

## Troubleshooting
- If MySQL is not ready, backend waits via healthcheck; you can retry `docker compose up`.
- Use `docker compose logs -f backend` and `docker compose logs -f db` for diagnostics.
- On schema changes, run `python manage.py makemigrations && python manage.py migrate` inside backend.