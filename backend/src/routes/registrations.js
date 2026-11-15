const express = require('express');
const crypto = require('crypto');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const router = express.Router();
const pool = require('../config/db');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function sendTicketEmail({ email, name, eventTitle, ticketId, qrDataUrl }) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return { sent: false, reason: 'SMTP is not configured' };
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT || 587) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
  await transporter.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to: email,
    subject: `Your CampusConnect ticket — ${eventTitle}`,
    text: `Hi ${name}, your registration for ${eventTitle} is confirmed. Your ticket ID is ${ticketId}. Show the attached QR code to the organizer at the entrance.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#123"><h2 style="color:#08775f">CampusConnect</h2><h3>Your event ticket is ready</h3><p>Hi ${escapeHtml(name)},</p><p>Your registration for <b>${escapeHtml(eventTitle)}</b> is confirmed.</p><p>Ticket ID: <b>#${ticketId}</b></p><p>Show the QR code below to the organizer at the entrance.</p><img alt="Event ticket QR code" style="width:240px;height:240px" src="cid:campus-ticket-qr"/><p>Discover. Connect. Participate.</p></div>`,
    attachments: [{ filename: `campusconnect-ticket-${ticketId}.png`, content: qrDataUrl.split(',')[1], encoding: 'base64', cid: 'campus-ticket-qr' }]
  });
  return { sent: true };
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`SELECT r.*, e.title AS event_title, e.event_date, e.venue,
      CASE WHEN a.id IS NULL THEN false ELSE true END AS checked_in
      FROM registrations r JOIN events e ON e.id=r.event_id
      LEFT JOIN tickets t ON t.registration_id=r.id LEFT JOIN attendance a ON a.ticket_id=t.id
      ORDER BY r.registered_at DESC`);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch registrations' }); }
});
router.get('/event/:eventId', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM registrations WHERE event_id=$1 ORDER BY registered_at DESC', [req.params.eventId]);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch registrations' }); }
});
router.get('/my', async (req, res) => {
  try {
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const result = await pool.query(`SELECT r.id AS registration_id, r.student_name, r.student_email, r.registered_at,
      e.id AS event_id, e.title AS event_title, e.event_date, e.event_time, e.venue,
      t.id AS ticket_id, (a.id IS NOT NULL) AS checked_in
      FROM registrations r JOIN events e ON e.id=r.event_id
      LEFT JOIN tickets t ON t.registration_id=r.id LEFT JOIN attendance a ON a.ticket_id=t.id
      WHERE LOWER(r.student_email)=LOWER($1) ORDER BY e.event_date ASC`, [email]);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch your registrations' }); }
});
router.post('/', async (req, res) => {
  const client = await pool.connect();
  let committed = false;
  try {
    const { event_id, student_name, student_email, usn, branch, section } = req.body;
    if (!event_id || !student_name?.trim() || !student_email?.trim()) return res.status(400).json({ error: 'Event, full name and email are required' });
    if (!usn?.trim() || !branch?.trim() || !section?.trim()) return res.status(400).json({ error: 'USN, branch and section are required' });
    const email = student_email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
    await client.query('BEGIN');
    const event = await client.query('SELECT id, title, capacity, entry_fee, image_url, event_date, venue FROM events WHERE id=$1 FOR UPDATE', [event_id]);
    if (!event.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Event not found' }); }
    const duplicate = await client.query('SELECT id FROM registrations WHERE event_id=$1 AND LOWER(student_email)=LOWER($2)', [event_id, email]);
    if (duplicate.rows.length) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'This email is already registered for the event.' }); }
    const count = await client.query('SELECT COUNT(*)::int AS total FROM registrations WHERE event_id=$1', [event_id]);
    if (count.rows[0].total >= event.rows[0].capacity) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Sorry, this event is fully booked.' }); }
    const inserted = await client.query(
      'INSERT INTO registrations (event_id, student_name, student_email, usn, branch, section) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [event_id, student_name.trim(), email, usn.trim().toUpperCase(), branch.trim(), section.trim().toUpperCase()]
    );
    const token = crypto.randomBytes(32).toString('base64url');
    const ticket = await client.query(
      'INSERT INTO tickets (registration_id, token_hash) VALUES ($1,$2) RETURNING id',
      [inserted.rows[0].id, hashToken(token)]
    );
    await client.query('COMMIT');
    committed = true;
    const ticketPayload = `CAMPUSCONNECT:TICKET:${token}`;
    const qrDataUrl = await QRCode.toDataURL(ticketPayload, { errorCorrectionLevel: 'H', margin: 2, width: 420, color: { dark: '#052b24', light: '#ffffff' } });
    let emailResult = { sent: false, reason: 'SMTP is not configured' };
    try {
      emailResult = await sendTicketEmail({ email, name: student_name.trim(), eventTitle: event.rows[0].title, ticketId: ticket.rows[0].id, qrDataUrl });
    } catch (mailErr) {
      console.error('Ticket email failed:', mailErr.message);
      emailResult = { sent: false, reason: 'Email delivery failed; ticket is available on this confirmation screen.' };
    }
    res.status(201).json({
      message: 'Registration successful',
      registration: inserted.rows[0],
      event: event.rows[0],
      ticket: { id: ticket.rows[0].id, qr_data_url: qrDataUrl, ticket_code: `CC-${String(ticket.rows[0].id).padStart(6, '0')}` },
      email: emailResult
    });
  } catch (err) {
    if (!committed) await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') return res.status(409).json({ error: 'This email is already registered for the event.' });
    console.error(err); res.status(500).json({ error: 'Failed to register' });
  } finally { client.release(); }
});
module.exports = router;
