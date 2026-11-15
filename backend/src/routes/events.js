const express = require('express');
const router = express.Router();
const pool = require('../config/db');

const eventFields = `e.*, (SELECT COUNT(*)::int FROM registrations r WHERE r.event_id = e.id) AS registered_count`;
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`SELECT ${eventFields} FROM events e ORDER BY e.event_date ASC, e.event_time ASC`);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch events' }); }
});
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`SELECT ${eventFields} FROM events e WHERE e.id = $1`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Event not found' });
    res.json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch event' }); }
});
router.post('/', async (req, res) => {
  try {
    const { title, description, club, venue, event_date, event_time, image_url, category, entry_fee, capacity } = req.body;
    if (!title?.trim() || !event_date) return res.status(400).json({ error: 'Title and event date are required' });
    const fee = Number(entry_fee ?? 0), seats = Number(capacity ?? 100);
    if (!Number.isFinite(fee) || fee < 0 || !Number.isInteger(seats) || seats < 1) return res.status(400).json({ error: 'Enter a valid fee and seat capacity' });
    const result = await pool.query(
      `INSERT INTO events (title, description, club, venue, event_date, event_time, image_url, category, entry_fee, capacity)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [title.trim(), description || '', club || '', venue || '', event_date, event_time || '', image_url || '', category || 'Other', fee, seats]
    );
    res.status(201).json({ ...result.rows[0], registered_count: 0 });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create event' }); }
});
router.put('/:id', async (req, res) => {
  try {
    const { title, description, club, venue, event_date, event_time, image_url, category, entry_fee, capacity } = req.body;
    const result = await pool.query(
      `UPDATE events SET title=COALESCE($1,title), description=COALESCE($2,description), club=COALESCE($3,club),
       venue=COALESCE($4,venue), event_date=COALESCE($5,event_date), event_time=COALESCE($6,event_time),
       image_url=COALESCE($7,image_url), category=COALESCE($8,category), entry_fee=COALESCE($9,entry_fee), capacity=COALESCE($10,capacity)
       WHERE id=$11 RETURNING *`,
      [title, description, club, venue, event_date, event_time, image_url, category, entry_fee, capacity, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Event not found' });
    res.json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update event' }); }
});
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM events WHERE id=$1 RETURNING *', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Event not found' });
    res.json({ message: 'Event deleted successfully' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete event' }); }
});
module.exports = router;
