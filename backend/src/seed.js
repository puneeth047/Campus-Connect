// Sample events for local demonstration. Edit these records to add real NIE events.
const pool = require('./config/db');
const events = [
  { title:'CodeStorm Hackathon', description:'Build a useful product with your team in this campus hackathon. Bring your ideas, collaborate and compete for exciting prizes.', club:'Coding Club', venue:'CSE Block – Lab Complex', event_date:'2026-11-22', event_time:'10:00 AM', category:'Technical', entry_fee:100, capacity:80, image_url:'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=85' },
  { title:'UI/UX Design Workshop', description:'A hands-on session covering design thinking, wireframing and building user-friendly interfaces with Figma.', club:'Design Club', venue:'Seminar Hall B', event_date:'2026-11-25', event_time:'02:00 PM', category:'Workshop', entry_fee:0, capacity:60, image_url:'https://images.unsplash.com/photo-1558655146-d09347e92766?w=1200&q=85' },
  { title:'Techno Cultural Fest 2026', description:'A celebration of creativity, technology and campus culture with performances, competitions and exhibitions.', club:'Student Council', venue:'Main Auditorium & Open Ground', event_date:'2026-11-20', event_time:'09:00 AM', category:'Cultural', entry_fee:150, capacity:250, image_url:'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200&q=85' },
  { title:'Open Source Contribution Drive', description:'Learn Git and GitHub, meet student mentors and make your first contribution to an open-source project.', club:'Developer Student Club', venue:'Innovation Lab', event_date:'2026-11-28', event_time:'11:00 AM', category:'Technical', entry_fee:0, capacity:50, image_url:'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&q=85' },
  { title:'Campus Sports Day', description:'Bring your team and take part in a day of friendly competition, energy and sportsmanship.', club:'Sports Committee', venue:'College Sports Ground', event_date:'2026-12-02', event_time:'08:00 AM', category:'Sports', entry_fee:50, capacity:120, image_url:'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&q=85' }
];
async function seed() {
  try {
    for (const e of events) {
      await pool.query(`INSERT INTO events (title,description,club,venue,event_date,event_time,image_url,category,entry_fee,capacity)
        SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
        WHERE NOT EXISTS (SELECT 1 FROM events WHERE title=$1)`,
      [e.title,e.description,e.club,e.venue,e.event_date,e.event_time,e.image_url,e.category,e.entry_fee,e.capacity]);
      console.log(`✓ ${e.title}`);
    }
    console.log('Seed completed. Existing events and registrations were preserved.');
    process.exit(0);
  } catch (err) { console.error('Seed failed:', err); process.exit(1); }
}
seed();
