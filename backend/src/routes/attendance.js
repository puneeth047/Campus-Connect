
const express = require('express');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const router = express.Router();
const pool = require('../config/db');
const { requireOrganizer } = require('./auth');

router.post('/verify', async (req, res) => {
  const raw = String(req.body?.qr_payload || '');
  const expectedEventId = Number(req.body?.event_id || 0);

  if (!Number.isInteger(expectedEventId) || expectedEventId < 1) {
    return res.status(400).json({ valid: false, error: 'Select the event before scanning tickets.' });
  }

  const match = raw.match(/^CAMPUSCONNECT:TICKET:([A-Za-z0-9_-]{30,})$/);
  if (!match) {
    return res.status(400).json({ valid: false, error: 'This QR code is not a valid CampusConnect ticket.' });
  }

  const tokenHash = crypto.createHash('sha256').update(match[1]).digest('hex');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const found = await client.query(`
      SELECT t.id AS ticket_id, r.id AS registration_id,
        r.student_name, r.student_email, e.title AS event_title,
        e.event_date, e.venue
      FROM tickets t
      JOIN registrations r ON r.id = t.registration_id
      JOIN events e ON e.id = r.event_id
      WHERE t.token_hash = $1 AND e.id = $2
      FOR UPDATE OF t
    `, [tokenHash, expectedEventId]);

    if (!found.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        valid: false,
        error: 'Ticket not found for the selected event. Check the event selection and ticket.'
      });
    }

    const ticket = found.rows[0];

    const existing = await client.query(
      'SELECT checked_in_at FROM attendance WHERE ticket_id = $1',
      [ticket.ticket_id]
    );

    if (existing.rows.length) {
      await client.query('COMMIT');
      return res.status(409).json({
        valid: true,
        already_checked_in: true,
        message: 'This ticket has already been checked in.',
        attendee: ticket,
        checked_in_at: existing.rows[0].checked_in_at
      });
    }

    await client.query(
      'INSERT INTO attendance (ticket_id, checked_in_by) VALUES ($1, $2)',
      [ticket.ticket_id, String(req.body.organizer || 'Organizer').slice(0, 150)]
    );

    await client.query('COMMIT');

    return res.json({
      valid: true,
      already_checked_in: false,
      message: 'Attendance marked successfully.',
      attendee: ticket,
      checked_in_at: new Date().toISOString()
    });

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({
      valid: false,
      error: 'Could not verify this ticket. Please try again.'
    });
  } finally {
    client.release();
  }
});

router.get('/event/:eventId', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT COUNT(*)::int AS checked_in
      FROM attendance a
      JOIN tickets t ON t.id = a.ticket_id
      JOIN registrations r ON r.id = t.registration_id
      WHERE r.event_id = $1
    `, [req.params.eventId]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load attendance count' });
  }
});

// Organizer-only PDF attendance report
router.get('/event/:eventId/report', requireOrganizer, async (req, res) => {
  const eventId = Number(req.params.eventId);

  if (!Number.isInteger(eventId) || eventId < 1) {
    return res.status(400).json({ error: 'Invalid event ID.' });
  }

  try {
    const eventResult = await pool.query(`
      SELECT id, title, event_date, venue
      FROM events
      WHERE id = $1
    `, [eventId]);

    if (!eventResult.rows.length) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const event = eventResult.rows[0];

    const [registeredResult, attendeesResult] = await Promise.all([
      pool.query(`
        SELECT COUNT(*)::int AS total_registered
        FROM registrations
        WHERE event_id = $1
      `, [eventId]),

      pool.query(`
        SELECT r.student_name, r.usn, r.branch, r.section,
               a.checked_in_at
        FROM attendance a
        JOIN tickets t ON t.id = a.ticket_id
        JOIN registrations r ON r.id = t.registration_id
        WHERE r.event_id = $1
        ORDER BY a.checked_in_at ASC
      `, [eventId])
    ]);

    const totalRegistered = registeredResult.rows[0].total_registered;
    const attendees = attendeesResult.rows;
    const totalAttended = attendees.length;
    const percentage = totalRegistered
      ? ((totalAttended / totalRegistered) * 100).toFixed(2)
      : '0.00';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="CampusConnect_Attendance_${eventId}.pdf"`
    );

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    doc.pipe(res);

    doc.fontSize(20).font('Helvetica-Bold')
      .text('CampusConnect', { align: 'center' });

    doc.moveDown(0.3);
    doc.fontSize(15).font('Helvetica-Bold')
      .text('Event Attendance Report', { align: 'center' });

    doc.moveDown();

    doc.fontSize(11).font('Helvetica-Bold').text('Event Details');
    doc.moveDown(0.4);

    doc.fontSize(10).font('Helvetica');
    doc.text(`Event: ${event.title}`);
    doc.text(`Date: ${String(event.event_date).slice(0, 10)}`);
    doc.text(`Venue: ${event.venue || 'Not specified'}`);

    doc.moveDown();
    doc.fontSize(11).font('Helvetica-Bold').text('Attendance Summary');
    doc.moveDown(0.4);

    doc.fontSize(10).font('Helvetica');
    doc.text(`Total registered: ${totalRegistered}`);
    doc.text(`Total attended: ${totalAttended}`);
    doc.text(`Attendance percentage: ${percentage}%`);

    doc.moveDown();
    doc.fontSize(11).font('Helvetica-Bold')
      .text('Checked-in Students');

    doc.moveDown(0.6);

    const columns = [
      { label: 'Name', x: 40, width: 115 },
      { label: 'USN', x: 155, width: 75 },
      { label: 'Branch', x: 230, width: 85 },
      { label: 'Section', x: 315, width: 50 },
      { label: 'Check-in Time', x: 365, width: 190 }
    ];

    function drawTableHeader() {
      const y = doc.y;
      doc.font('Helvetica-Bold').fontSize(8);

      columns.forEach(col => {
        doc.text(col.label, col.x, y, {
          width: col.width,
          lineBreak: false
        });
      });

      doc.moveDown(1.5);
      doc.font('Helvetica').fontSize(8);
    }

    drawTableHeader();

    if (!attendees.length) {
      doc.fontSize(10).text('No students have checked in for this event.');
    }

    attendees.forEach(student => {
      if (doc.y > 740) {
        doc.addPage();
        drawTableHeader();
      }

      const y = doc.y;
      const checkedIn = student.checked_in_at
        ? new Date(student.checked_in_at).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata'
          })
        : '-';

      const values = [
        student.student_name || '-',
        student.usn || '-',
        student.branch || '-',
        student.section || '-',
        checkedIn
      ];

      values.forEach((value, index) => {
        doc.text(String(value), columns[index].x, y, {
          width: columns[index].width,
          height: 30,
          ellipsis: true
        });
      });

      doc.moveDown(1.8);
    });

    doc.end();

  } catch (err) {
    console.error('Attendance report error:', err);

    if (!res.headersSent) {
      res.status(500).json({ error: 'Could not generate attendance report.' });
    } else {
      res.destroy(err);
    }
  }
});

module.exports = router;
