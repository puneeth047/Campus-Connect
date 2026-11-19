
const express = require('express');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const router = express.Router();
const pool = require('../config/db');
const { requireOrganizer } = require('./auth');

// Verify QR ticket and mark attendance
router.post('/verify', async (req, res) => {
  const raw = String(req.body?.qr_payload || '');
  const expectedEventId = Number(req.body?.event_id || 0);

  if (!Number.isInteger(expectedEventId) || expectedEventId < 1) {
    return res.status(400).json({
      valid: false,
      error: 'Select the event before scanning tickets.'
    });
  }

  const match = raw.match(/^CAMPUSCONNECT:TICKET:([A-Za-z0-9_-]{30,})$/);

  if (!match) {
    return res.status(400).json({
      valid: false,
      error: 'This QR code is not a valid CampusConnect ticket.'
    });
  }

  const tokenHash = crypto.createHash('sha256')
    .update(match[1])
    .digest('hex');

  let client;

  try {
    client = await pool.connect();

    await client.query('BEGIN');

    const found = await client.query(`
      SELECT
        t.id AS ticket_id,
        r.id AS registration_id,
        r.student_name,
        r.student_email,
        e.title AS event_title,
        e.event_date,
        e.event_time,
        e.venue
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
      `INSERT INTO attendance (ticket_id, checked_in_by)
       VALUES ($1, $2)`,
      [
        ticket.ticket_id,
        String(req.body.organizer || 'Organizer').slice(0, 150)
      ]
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
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }

    console.error('QR verification error:', err);

    return res.status(500).json({
      valid: false,
      error: 'Could not verify this ticket. Please try again.'
    });

  } finally {
    if (client) client.release();
  }
});


// Get event attendance count
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
    res.status(500).json({
      error: 'Failed to load attendance count'
    });
  }
});


// Generate organizer-only PDF attendance report
router.get('/event/:eventId/report', requireOrganizer, async (req, res) => {
  const eventId = Number(req.params.eventId);

  if (!Number.isInteger(eventId) || eventId < 1) {
    return res.status(400).json({
      error: 'Invalid event ID.'
    });
  }

  try {
    // Fetch event details, including event_time
    const eventResult = await pool.query(`
      SELECT id, title, event_date, event_time, venue
      FROM events
      WHERE id = $1
    `, [eventId]);

    if (!eventResult.rows.length) {
      return res.status(404).json({
        error: 'Event not found.'
      });
    }

    const event = eventResult.rows[0];

    const [registeredResult, attendeesResult] = await Promise.all([
      pool.query(`
        SELECT COUNT(*)::int AS total_registered
        FROM registrations
        WHERE event_id = $1
      `, [eventId]),

      pool.query(`
        SELECT
          r.student_name,
          r.usn,
          r.branch,
          r.section,
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
    const notAttended = Math.max(0, totalRegistered - totalAttended);

    const percentage = totalRegistered
      ? ((totalAttended / totalRegistered) * 100).toFixed(2)
      : '0.00';

    // PDF response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="CampusConnect_Attendance_${eventId}.pdf"`
    );

    // A4 landscape PDF
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: {
        top: 32,
        bottom: 32,
        left: 32,
        right: 32
      },
      bufferPages: false
    });

    doc.pipe(res);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 32;
    const contentWidth = pageWidth - margin * 2;
    const bottomLimit = pageHeight - 32;

    // Date formatting
    const eventDate = event.event_date
      ? String(event.event_date).slice(0, 10)
      : 'Not specified';

    const generatedDate = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    // PDF heading
    doc.fillColor('#176B50')
      .font('Helvetica-Bold')
      .fontSize(23)
      .text('CampusConnect', margin, 30, {
        width: contentWidth,
        align: 'center'
      });

    doc.fillColor('#263238')
      .fontSize(15)
      .text('EVENT ATTENDANCE REPORT', {
        align: 'center'
      });

    doc.moveDown(0.4);

    doc.strokeColor('#176B50')
      .lineWidth(1.5)
      .moveTo(margin, doc.y)
      .lineTo(pageWidth - margin, doc.y)
      .stroke();

    doc.moveDown(0.8);

    // Event details
    const detailsY = doc.y;

    doc.fillColor('#176B50')
      .font('Helvetica-Bold')
      .fontSize(11)
      .text('EVENT DETAILS', margin, detailsY);

    doc.moveDown(0.5);

    const detailY = doc.y;

    const details = [
      `Event: ${event.title || 'Untitled event'}`,
      `Date: ${eventDate}`,
      `Time: ${event.event_time || 'Not specified'}`,
      `Venue: ${event.venue || 'Not specified'}`
    ];

    details.forEach((detail, index) => {
      const x = index % 2 === 0
        ? margin
        : margin + contentWidth / 2;

      const y = detailY + Math.floor(index / 2) * 19;

      doc.fillColor('#263238')
        .font('Helvetica')
        .fontSize(9)
        .text(detail, x, y, {
          width: contentWidth / 2 - 10,
          ellipsis: true
        });
    });

    doc.y = detailY + 43;
    doc.moveDown(0.3);

    // Attendance summary
    doc.fillColor('#176B50')
      .font('Helvetica-Bold')
      .fontSize(11)
      .text('ATTENDANCE SUMMARY', margin, doc.y);

    doc.moveDown(0.6);

    const summaryY = doc.y;
    const gap = 10;
    const cardWidth = (contentWidth - gap * 3) / 4;
    const cardHeight = 48;

    const summaryItems = [
      { label: 'TOTAL REGISTERED', value: totalRegistered },
      { label: 'CHECKED IN', value: totalAttended },
      { label: 'NOT ATTENDED', value: notAttended },
      { label: 'ATTENDANCE', value: `${percentage}%` }
    ];

    summaryItems.forEach((item, index) => {
      const x = margin + index * (cardWidth + gap);

      doc.roundedRect(x, summaryY, cardWidth, cardHeight, 5)
        .fillAndStroke('#F0F6F3', '#C9DDD3');

      doc.fillColor('#52645C')
        .font('Helvetica-Bold')
        .fontSize(8)
        .text(item.label, x + 9, summaryY + 8, {
          width: cardWidth - 18
        });

      doc.fillColor('#176B50')
        .font('Helvetica-Bold')
        .fontSize(17)
        .text(String(item.value), x + 9, summaryY + 23, {
          width: cardWidth - 18
        });
    });

    doc.y = summaryY + cardHeight + 18;

    // Student table
    doc.fillColor('#176B50')
      .font('Helvetica-Bold')
      .fontSize(11)
      .text('CHECKED-IN STUDENTS', margin, doc.y);

    doc.moveDown(0.6);

    const columns = [
      { label: 'SL. NO.', width: 38 },
      { label: 'STUDENT NAME', width: 205 },
      { label: 'SECTION', width: 65 },
      { label: 'USN', width: 125 },
      { label: 'BRANCH', width: 100 },
      { label: 'CHECK-IN TIME', width: contentWidth - 533 }
    ];

    let tableY = doc.y;
    const headerHeight = 25;

    function drawTableHeader() {
      let x = margin;

      columns.forEach(column => {
        doc.rect(x, tableY, column.width, headerHeight)
          .fillAndStroke('#176B50', '#FFFFFF');

        doc.fillColor('#FFFFFF')
          .font('Helvetica-Bold')
          .fontSize(8)
          .text(column.label, x + 5, tableY + 8, {
            width: column.width - 10,
            align: 'left',
            lineBreak: false
          });

        x += column.width;
      });

      tableY += headerHeight;
    }

    drawTableHeader();

    if (!attendees.length) {
      doc.rect(margin, tableY, contentWidth, 35)
        .fillAndStroke('#F7FAF8', '#D5E0DA');

      doc.fillColor('#52645C')
        .font('Helvetica')
        .fontSize(9)
        .text(
          'No students have checked in for this event.',
          margin + 10,
          tableY + 12
        );

      tableY += 35;
    }

    attendees.forEach((student, index) => {
      const checkedIn = student.checked_in_at
        ? new Date(student.checked_in_at).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            dateStyle: 'medium',
            timeStyle: 'short'
          })
        : '-';

      const values = [
        String(index + 1),
        student.student_name || '-',
        student.section || '-',
        student.usn || '-',
        student.branch || '-',
        checkedIn
      ];

      // Calculate row height based on the longest cell
      let rowHeight = 24;

      values.forEach((value, cellIndex) => {
        const height = doc.heightOfString(String(value), {
          width: columns[cellIndex].width - 12,
          font: 'Helvetica',
          fontSize: 8,
          lineGap: 2
        });

        rowHeight = Math.max(rowHeight, height + 12);
      });

      // Add a new page when the next row does not fit
      if (tableY + rowHeight > bottomLimit) {
        doc.addPage();
        tableY = margin;
        drawTableHeader();
      }

      let x = margin;

      values.forEach((value, cellIndex) => {
        const column = columns[cellIndex];

        const background = index % 2 === 0
          ? '#F3F7F5'
          : '#FFFFFF';

        doc.rect(x, tableY, column.width, rowHeight)
          .fillAndStroke(background, '#D5E0DA');

        doc.fillColor('#263238')
          .font('Helvetica')
          .fontSize(8)
          .text(String(value), x + 6, tableY + 6, {
            width: column.width - 12,
            height: rowHeight - 8,
            ellipsis: true,
            lineGap: 2
          });

        x += column.width;
      });

      tableY += rowHeight;
    });

    // Footer
    doc.fontSize(8)
      .fillColor('#7A8981')
      .font('Helvetica')
      .text(
        `Generated by CampusConnect | ${generatedDate}`,
        margin,
        pageHeight - 22,
        {
          width: contentWidth,
          align: 'center',
          lineBreak: false
        }
      );

    doc.end();

  } catch (err) {
    console.error('Attendance report error:', err);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Could not generate attendance report.'
      });
    } else {
      res.destroy(err);
    }
  }
});

module.exports = router;
