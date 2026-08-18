-- ============================================================
-- Event Management System - Database Schema
-- ============================================================
-- Run this file after creating the database:
--   psql -U postgres -d event_management -f database/schema.sql
-- ============================================================

-- Drop tables if they already exist (useful for re-running the script)
DROP TABLE IF EXISTS registrations;
DROP TABLE IF EXISTS events;

-- ============================================================
-- Table: events
-- ============================================================
CREATE TABLE events (
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(150) NOT NULL,
    description      TEXT,
    date             DATE NOT NULL,
    time             TIME NOT NULL,
    location         VARCHAR(150) NOT NULL,
    organizer        VARCHAR(150) NOT NULL,
    capacity         INTEGER NOT NULL CHECK (capacity > 0),
    available_seats  INTEGER NOT NULL CHECK (available_seats >= 0),
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- available_seats can never exceed capacity
    CONSTRAINT available_seats_within_capacity CHECK (available_seats <= capacity)
);

-- ============================================================
-- Table: registrations
-- ============================================================
CREATE TABLE registrations (
    id             SERIAL PRIMARY KEY,
    event_id       INTEGER NOT NULL,
    user_name      VARCHAR(150) NOT NULL,
    user_email     VARCHAR(150) NOT NULL,
    registered_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_event
        FOREIGN KEY (event_id)
        REFERENCES events (id)
        ON DELETE CASCADE,

    -- Prevent the same user from registering for the same event twice
    CONSTRAINT unique_event_email UNIQUE (event_id, user_email)
);

-- Helpful indexes for search and lookups
CREATE INDEX idx_events_name ON events (name);
CREATE INDEX idx_events_location ON events (location);
CREATE INDEX idx_events_organizer ON events (organizer);
CREATE INDEX idx_registrations_event_id ON registrations (event_id);

-- ============================================================
-- Sample data: events
-- ============================================================
INSERT INTO events (name, description, date, time, location, organizer, capacity, available_seats)
VALUES
    ('Tech Conference 2026', 'Technology conference for developers covering AI, web, and cloud.', '2026-09-20', '10:00', 'Delhi', 'Tech Community', 100, 98),
    ('Startup Networking Night', 'An evening of networking for founders and investors.', '2026-10-05', '18:30', 'Bengaluru', 'Startup Hub', 50, 50),
    ('AI & Data Science Summit', 'Talks and workshops on AI, ML, and data science.', '2026-11-12', '09:30', 'Hyderabad', 'DataMinds', 150, 150);

-- ============================================================
-- Sample data: registrations
-- ============================================================
INSERT INTO registrations (event_id, user_name, user_email)
VALUES
    (1, 'Vanisha', 'vanisha@example.com'),
    (1, 'Rahul Sharma', 'rahul.sharma@example.com');
