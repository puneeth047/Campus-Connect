const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const pool = require('../config/db');

router.post('/verify', async (req, res) => {
  const raw = String(req.body?.qr_payload || '');
  const expectedEventId = Number(req.body?.event_id || 0);
  if (!Number.isInteger(expectedEventId) || expectedEventId < 1) return res.status(400).json({ valid: false, error: 'Select the event before scanning tickets.' });
  const match = raw.match(/^CAMPUSCONNECT:TICKET:([A-Za-z0-9_-]{30,})$/);
  if (!match) return res.status(400).json({ valid: false, error: 'This QR code is not a valid CampusConnect ticket.' });
  const tokenHash = crypto.createHash('sha256').update(match[1]).digest('hex');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(`SELECT t.id AS ticket_id, r.id AS registration_id, r.student_name,
      r.student_email, e.title AS event_title, e.event_date, e.venue
      FROM tickets t JOIN registrations r ON r.id=t.registration_id
      JOIN events e ON e.id=r.event_id WHERE t.token_hash=$1 AND e.id=$2 FOR UPDATE OF t`, [tokenHash, expectedEventId]);
    if (!found.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ valid: false, error: 'Ticket not found for the selected event. Check the event selection and ticket.' });
    }
    const ticket = found.rows[0];
    const existing = await client.query('SELECT checked_in_at FROM attendance WHERE ticket_id=$1', [ticket.ticket_id]);
    if (existing.rows.length) {
      await client.query('COMMIT');
      return res.status(409).json({ valid: true, already_checked_in: true, message: 'This ticket has already been checked in.', attendee: ticket, checked_in_at: existing.rows[0].checked_in_at });
    }
    await client.query('INSERT INTO attendance (ticket_id, checked_in_by) VALUES ($1,$2)', [ticket.ticket_id, String(req.body.organizer || 'Organizer').slice(0,150)]);
    await client.query('COMMIT');
    return res.json({ valid: true, already_checked_in: false, message: 'Attendance marked successfully.', attendee: ticket, checked_in_at: new Date().toISOString() });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ valid: false, error: 'Could not verify this ticket. Please try again.' });
  } finally { client.release(); }
});

router.get('/event/:eventId', async (req, res) => {
  try {
    const result = await pool.query(`SELECT COUNT(*)::int AS checked_in FROM attendance a
      JOIN tickets t ON t.id=a.ticket_id JOIN registrations r ON r.id=t.registration_id
      WHERE r.event_id=$1`, [req.params.eventId]);
    res.json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load attendance count' }); }
});
module.exports = router;
