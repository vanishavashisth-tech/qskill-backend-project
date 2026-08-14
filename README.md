# Event Management System — Backend

A REST API for an event management platform, built for the QSkill Backend Development internship (Slab 2 — Intermediate).

## Features

- **Auth**: register/login with JWT, passwords hashed with bcrypt
- **Roles**: `user` and `admin`
- **Events**: create, read, update, delete — with title, description, date, time, location, capacity
- **Approval workflow**: new/edited events start as `pending`; only `approved` events are publicly visible and open for registration; admins approve or reject
- **Registrations**: users register for events with atomic capacity validation (no overbooking, even under concurrent requests), can cancel, and can view their own registrations
- **Filtering**: list events by date and/or location, with pagination
- **Organizer view**: see the events you created and who's registered for them

## Stack

Node.js, Express, MongoDB (Mongoose), JWT, bcryptjs

## Setup

```bash
npm install
cp .env.example .env   # then fill in MONGO_URI and JWT_SECRET
npm run dev             # or: npm start
```

Requires a running MongoDB instance — either local (`mongodb://localhost:27017/event-management`) or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster.

## Data Models

**User**: `name`, `email` (unique), `password` (hashed), `role` (`user` | `admin`)

**Event**: `title`, `description`, `date`, `time`, `location`, `capacity`, `registeredCount`, `organizer` (ref User), `status` (`pending` | `approved` | `rejected`)

**Registration**: `event` (ref Event), `user` (ref User), `status` (`registered` | `cancelled`) — unique per user/event pair

## API Reference

All protected routes require `Authorization: Bearer <token>`.

### Auth

| Method | Route | Access | Body |
|---|---|---|---|
| POST | `/api/auth/register` | Public | `{ name, email, password, role? }` |
| POST | `/api/auth/login` | Public | `{ email, password }` |
| GET | `/api/auth/me` | Private | — |

`role` in register defaults to `"user"`; pass `"admin"` to create an admin for testing/demo purposes.

### Events

| Method | Route | Access | Notes |
|---|---|---|---|
| GET | `/api/events` | Public | Query: `?date=YYYY-MM-DD&location=text&page=1&limit=10`. Non-admins only see `approved` events. |
| GET | `/api/events/mine` | Private | Events you organize, any status |
| GET | `/api/events/:id` | Public | Single event |
| POST | `/api/events` | Private | Create an event — starts as `pending` |
| PUT | `/api/events/:id` | Private (owner or admin) | Non-admin edits reset status to `pending` |
| DELETE | `/api/events/:id` | Private (owner or admin) | Also deletes its registrations |
| PUT | `/api/events/:id/approve` | Private (admin only) | `{ status: "approved" | "rejected" }` |

### Registrations

| Method | Route | Access | Notes |
|---|---|---|---|
| POST | `/api/events/:id/register` | Private | Fails if event isn't approved, already full, or already registered |
| DELETE | `/api/events/:id/register` | Private | Cancels your registration, frees a spot |
| GET | `/api/events/mine/registrations` | Private | Your active registrations |
| GET | `/api/events/:id/registrations` | Private (organizer or admin) | Who's registered for an event |

## Example Requests

**Register**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Asha","email":"asha@example.com","password":"password123"}'
```

**Create an event** (with token from login/register)
```bash
curl -X POST http://localhost:5000/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"title":"Tech Meetup","description":"Monthly meetup","date":"2026-09-20","time":"18:00","location":"Delhi","capacity":50}'
```

**Approve an event** (as admin)
```bash
curl -X PUT http://localhost:5000/api/events/<EVENT_ID>/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -d '{"status":"approved"}'
```

**Register for an event**
```bash
curl -X POST http://localhost:5000/api/events/<EVENT_ID>/register \
  -H "Authorization: Bearer <TOKEN>"
```

## Design Notes

- Capacity checks use an atomic `findOneAndUpdate` with a `$expr: { $lt: [...] }` condition rather than a read-then-write, so two simultaneous registration requests can't both slip into the last open spot — no MongoDB replica set/transaction required.
- Event edits by a non-admin reset the event to `pending` so admins can re-review changed details before it's public again.
- Deleting an event cascades to delete its registrations, so no orphaned records are left behind.
