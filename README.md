# Event Management System

A backend REST API for managing events and event registrations, built with **Node.js**, **Express.js**, and **PostgreSQL**. Users can create events, browse and search them, register for events, and manage those registrations — all backed by a relational schema with foreign-key constraints and transaction-safe seat management.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Installation](#installation)
- [PostgreSQL Setup](#postgresql-setup)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)
- [Postman Testing Guide](#postman-testing-guide)
- [Sample Requests & Responses](#sample-requests--responses)
- [Future Improvements](#future-improvements)

---

## Features

- Create, view, search, and delete events
- Register for an event, view registrations, and cancel a registration
- Automatic seat tracking (`available_seats`) kept consistent with PostgreSQL transactions
- Prevents duplicate registrations (same email can't register twice for the same event)
- Prevents registration once an event is full
- Cascading delete: removing an event also removes its registrations
- Centralized error handling with consistent JSON response shape
- Parameterized SQL queries throughout (no SQL injection risk)

## Tech Stack

| Layer          | Technology            |
|----------------|------------------------|
| Runtime        | Node.js                |
| Framework      | Express.js              |
| Database       | PostgreSQL              |
| DB Driver      | `pg` (node-postgres)    |
| Config         | `dotenv`                |
| API Testing    | Postman                 |

## Project Structure

```
event-management-system/
│
├── src/
│   ├── config/
│   │   └── db.js                    # PostgreSQL connection pool
│   │
│   ├── controllers/
│   │   ├── eventController.js       # Request handlers for /api/events
│   │   └── registrationController.js# Request handlers for /api/registrations
│   │
│   ├── models/
│   │   ├── eventModel.js            # SQL queries for events table
│   │   └── registrationModel.js     # SQL queries for registrations table
│   │
│   ├── routes/
│   │   ├── eventRoutes.js
│   │   └── registrationRoutes.js
│   │
│   ├── middleware/
│   │   └── errorMiddleware.js       # Centralized error + 404 handling
│   │
│   ├── utils/
│   │   └── ApiError.js              # Custom error class with HTTP status codes
│   │
│   └── app.js                       # Express app setup (middleware + routes)
│
├── database/
│   └── schema.sql                   # Table definitions + sample data
│
├── .env                             # Local environment variables (not committed)
├── .env.example                     # Template for environment variables
├── .gitignore
├── package.json
├── server.js                        # Entry point — starts the server
└── README.md
```

## Database Schema

### `events`

| Column           | Type          | Constraints                                    |
|------------------|---------------|-------------------------------------------------|
| id               | SERIAL        | PRIMARY KEY                                     |
| name             | VARCHAR(150)  | NOT NULL                                        |
| description      | TEXT          |                                                  |
| date             | DATE          | NOT NULL                                        |
| time             | TIME          | NOT NULL                                        |
| location         | VARCHAR(150)  | NOT NULL                                        |
| organizer        | VARCHAR(150)  | NOT NULL                                        |
| capacity         | INTEGER       | NOT NULL, CHECK (capacity > 0)                  |
| available_seats  | INTEGER       | NOT NULL, CHECK (0 <= available_seats <= capacity) |
| created_at       | TIMESTAMP     | NOT NULL, DEFAULT CURRENT_TIMESTAMP             |

### `registrations`

| Column         | Type          | Constraints                                          |
|----------------|---------------|--------------------------------------------------------|
| id             | SERIAL        | PRIMARY KEY                                            |
| event_id       | INTEGER       | NOT NULL, FOREIGN KEY → events(id) ON DELETE CASCADE   |
| user_name      | VARCHAR(150)  | NOT NULL                                                |
| user_email     | VARCHAR(150)  | NOT NULL                                                |
| registered_at  | TIMESTAMP     | NOT NULL, DEFAULT CURRENT_TIMESTAMP                     |

`UNIQUE (event_id, user_email)` — a given email can only register once per event.

See [`database/schema.sql`](database/schema.sql) for the full DDL, indexes, and sample data.

## API Documentation

Base URL: `http://localhost:5000/api`

All responses follow this shape:

```json
{ "success": true,  "message": "...", "data": {} }
{ "success": false, "message": "..." }
```

### Event Endpoints

| Method | Endpoint                          | Description                                  |
|--------|------------------------------------|-----------------------------------------------|
| GET    | `/events`                          | Get all events                                |
| GET    | `/events/search?keyword=...`       | Search events by name/description/location/organizer |
| GET    | `/events/:id`                      | Get a single event by ID                      |
| POST   | `/events`                          | Create a new event                            |
| DELETE | `/events/:id`                      | Delete an event (and its registrations)       |

### Registration Endpoints

| Method | Endpoint                            | Description                                |
|--------|---------------------------------------|----------------------------------------------|
| GET    | `/registrations`                      | Get all registrations                        |
| GET    | `/registrations/event/:eventId`       | Get all registrations for one event          |
| GET    | `/registrations/:id`                  | Get a single registration by ID              |
| POST   | `/registrations`                      | Register for an event                        |
| DELETE | `/registrations/:id`                  | Cancel a registration                        |

## Installation

```bash
# 1. Clone / unzip the project, then move into it
cd event-management-system

# 2. Install dependencies
npm install
```

## PostgreSQL Setup

1. **Create the database:**

   ```bash
   psql -U postgres -c "CREATE DATABASE event_management;"
   ```

2. **Load the schema and sample data:**

   ```bash
   psql -U postgres -d event_management -f database/schema.sql
   ```

   This creates the `events` and `registrations` tables, adds indexes, and inserts a few sample events/registrations.

## Environment Variables

Copy `.env.example` to `.env` and fill in your local PostgreSQL credentials:

```bash
cp .env.example .env
```

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_NAME=event_management

PORT=5000
```

Credentials are never hardcoded in the source — everything is read from `process.env` via `dotenv`.

## Running the Project

```bash
# Production
npm start

# Development (auto-restarts on file changes, requires nodemon)
npm run dev
```

You should see:

```
Server is running on http://localhost:5000
Connected to PostgreSQL database successfully.
```

Visit `http://localhost:5000/` for a quick health check.

---

## Postman Testing Guide

Import the base URL `http://localhost:5000/api` as a Postman environment variable (e.g. `{{baseUrl}}`) and test each endpoint below.

### 1. Create Event
- **Method:** POST
- **URL:** `{{baseUrl}}/events`
- **Body (JSON):**
  ```json
  {
    "name": "Tech Conference 2026",
    "description": "Technology conference for developers",
    "date": "2026-09-20",
    "time": "10:00",
    "location": "Delhi",
    "organizer": "Tech Community",
    "capacity": 100
  }
  ```
- **Expected status:** `201 Created`
- **Expected response:** `success: true`, `data` contains the new event with `available_seats` equal to `capacity`.

### 2. Get All Events
- **Method:** GET
- **URL:** `{{baseUrl}}/events`
- **Expected status:** `200 OK`

### 3. Search Event
- **Method:** GET
- **URL:** `{{baseUrl}}/events/search?keyword=technology`
- **Expected status:** `200 OK` — returns events whose name/description/location/organizer match the keyword.

### 4. Get Event by ID
- **Method:** GET
- **URL:** `{{baseUrl}}/events/1`
- **Expected status:** `200 OK`

### 5. Register for Event
- **Method:** POST
- **URL:** `{{baseUrl}}/registrations`
- **Body (JSON):**
  ```json
  {
    "event_id": 1,
    "user_name": "Vanisha",
    "user_email": "vanisha@example.com"
  }
  ```
- **Expected status:** `201 Created`
- **Expected response:** `success: true`, `data` contains the new registration. The event's `available_seats` decreases by 1.

### 6. Get All Registrations
- **Method:** GET
- **URL:** `{{baseUrl}}/registrations`
- **Expected status:** `200 OK`

### 7. Get Registrations for an Event
- **Method:** GET
- **URL:** `{{baseUrl}}/registrations/event/1`
- **Expected status:** `200 OK`

### 8. Get Registration by ID
- **Method:** GET
- **URL:** `{{baseUrl}}/registrations/1`
- **Expected status:** `200 OK`

### 9. Cancel Registration
- **Method:** DELETE
- **URL:** `{{baseUrl}}/registrations/1`
- **Expected status:** `200 OK`
- **Expected response:** `success: true`. The event's `available_seats` increases by 1.

### 10. Delete Event
- **Method:** DELETE
- **URL:** `{{baseUrl}}/events/1`
- **Expected status:** `200 OK`
- **Expected response:** `success: true`. All registrations for that event are removed too.

### Negative / Edge-Case Tests

| Test | Request | Expected status | Expected message |
|------|---------|------------------|--------------------|
| Invalid event ID | `GET {{baseUrl}}/events/abc` | 400 | `Invalid event ID` |
| Missing required fields (create event) | `POST {{baseUrl}}/events` with `{"name": "X"}` | 400 | `Missing required field(s): ...` |
| Invalid registration ID | `GET {{baseUrl}}/registrations/abc` | 400 | `Invalid registration ID` |
| Duplicate registration | Register the same `event_id` + `user_email` twice | 409 | `This email is already registered for this event` |
| Registration for non-existing event | `POST {{baseUrl}}/registrations` with `event_id: 9999` | 404 | `Event not found` |
| Registration when event is full | Register once `available_seats` is 0 | 400 | `No available seats for this event` |
| Deleting non-existing event | `DELETE {{baseUrl}}/events/9999` | 404 | `Event not found` |
| Cancelling non-existing registration | `DELETE {{baseUrl}}/registrations/9999` | 404 | `Registration not found` |

---

## Sample API Requests/Responses

**Request:** `POST /api/events`
```json
{
  "name": "Tech Conference 2026",
  "description": "Technology conference for developers",
  "date": "2026-09-20",
  "time": "10:00",
  "location": "Delhi",
  "organizer": "Tech Community",
  "capacity": 100
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Event created successfully",
  "data": {
    "id": 1,
    "name": "Tech Conference 2026",
    "description": "Technology conference for developers",
    "date": "2026-09-20T00:00:00.000Z",
    "time": "10:00:00",
    "location": "Delhi",
    "organizer": "Tech Community",
    "capacity": 100,
    "available_seats": 100,
    "created_at": "2026-08-18T04:05:15.567Z"
  }
}
```

**Request:** `POST /api/registrations` (event already full)

**Response:** `400 Bad Request`
```json
{
  "success": false,
  "message": "No available seats for this event"
}
```

## Future Improvements

- Add user authentication (JWT) so registrations are tied to logged-in accounts
- Add pagination and sorting to `GET /events` and `GET /registrations`
- Add event update (`PUT /api/events/:id`)
- Add email confirmation for successful registrations
- Add automated tests (Jest + Supertest)
- Add rate limiting and request logging middleware
- Dockerize the app and database for one-command local setup
