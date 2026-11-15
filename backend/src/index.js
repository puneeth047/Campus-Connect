require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const eventRoutes = require('./routes/events');
const registrationRoutes = require('./routes/registrations');
const attendanceRoutes = require('./routes/attendance');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'Campus Events API is running' }));

async function initDB() {
  await pool.query(`CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY, title VARCHAR(255) NOT NULL, description TEXT, club VARCHAR(150),
    venue VARCHAR(150), event_date DATE NOT NULL, event_time VARCHAR(30),
    image_url TEXT, category VARCHAR(80) DEFAULT 'Other', entry_fee NUMERIC(10,2) DEFAULT 0,
    capacity INTEGER DEFAULT 100, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  // Safe migrations for databases created by the earlier project version.
  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT`);
  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS category VARCHAR(80) DEFAULT 'Other'`);
  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS entry_fee NUMERIC(10,2) DEFAULT 0`);
  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 100`);
  await pool.query(`CREATE TABLE IF NOT EXISTS registrations (
    id SERIAL PRIMARY KEY, event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    student_name VARCHAR(150) NOT NULL, student_email VARCHAR(150) NOT NULL,
    usn VARCHAR(30), branch VARCHAR(80), section VARCHAR(20),
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, student_email)
  )`);
  // Safe migrations for older databases that only had name + email
  await pool.query(`ALTER TABLE registrations ADD COLUMN IF NOT EXISTS usn VARCHAR(30)`);
  await pool.query(`ALTER TABLE registrations ADD COLUMN IF NOT EXISTS branch VARCHAR(80)`);
  await pool.query(`ALTER TABLE registrations ADD COLUMN IF NOT EXISTS section VARCHAR(20)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    registration_id INTEGER NOT NULL UNIQUE REFERENCES registrations(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
    checked_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checked_in_by VARCHAR(150) DEFAULT 'Organizer'
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_registrations_event ON registrations(event_id)`);
  console.log('Database tables ready');
}

initDB().then(() => app.listen(PORT, () => console.log(`API server running on port ${PORT}`)))
  .catch((err) => { console.error('Database initialization failed:', err); process.exit(1); });
