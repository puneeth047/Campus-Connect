import { Link } from 'react-router-dom'

const fallback = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=85'
export default function EventCard({ event }) {
  const date = event.event_date ? new Date(`${String(event.event_date).slice(0,10)}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date TBA'
  const seatsLeft = Math.max(0, Number(event.capacity || 0) - Number(event.registered_count || 0))
  return (
    <article className="event-card">
      <div className="event-card-image">
        <img src={event.image_url || fallback} alt={`${event.title} event poster`} onError={e => { e.currentTarget.src = fallback }} />
        <span className="event-category">{event.category || 'Campus event'}</span>
        <span className="event-fee">{Number(event.entry_fee || 0) === 0 ? 'FREE' : `₹${Number(event.entry_fee).toLocaleString('en-IN')}`}</span>
      </div>
      <div className="event-card-body">
        <p className="event-organizer">{event.club || 'NIE Campus'}</p>
        <h3>{event.title}</h3>
        <p className="event-description">{event.description || 'Join us for an exciting campus experience.'}</p>
        <div className="event-meta"><span>▦ {date}</span><span>◷ {event.event_time || 'Time TBA'}</span><span className="venue">⌖ {event.venue || 'Venue TBA'}</span></div>
        <div className="event-card-bottom">
          <span className={seatsLeft > 0 ? 'seats-open' : 'seats-full'}>{seatsLeft > 0 ? `${seatsLeft} seats left` : 'Fully booked'}</span>
          <span>{event.registered_count || 0} registered</span>
        </div>
        <Link to={`/register/${event.id}`} className="event-register-link">View event & Register <span>→</span></Link>
      </div>
    </article>
  )
}
