-- Work Schedule Management Tables
-- Run this SQL on the server to create schedule tables

-- Consultants table
CREATE TABLE IF NOT EXISTS consultants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Work schedule table
CREATE TABLE IF NOT EXISTS work_schedule (
    id SERIAL PRIMARY KEY,
    consultant_id INTEGER REFERENCES consultants(id),
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Monday, 7=Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blocked dates table
CREATE TABLE IF NOT EXISTS blocked_dates (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    reason TEXT,
    consultant_id INTEGER REFERENCES consultants(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Booking settings table
CREATE TABLE IF NOT EXISTS booking_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Grant permissions
GRANT ALL PRIVILEGES ON consultants TO consultation_user;
GRANT ALL PRIVILEGES ON work_schedule TO consultation_user;
GRANT ALL PRIVILEGES ON blocked_dates TO consultation_user;
GRANT ALL PRIVILEGES ON booking_settings TO consultation_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO consultation_user;
