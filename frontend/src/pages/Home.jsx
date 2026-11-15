import { useEffect, useMemo, useState } from 'react'
import EventCard from '../components/EventCard'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const categories = ['All', 'Technical', 'Cultural', 'Workshop', 'Sports', 'Other']

function FeatureIcon({ type }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  if (type === 'calendar') return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"/></svg>
  if (type === 'clubs') return <svg {...common}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20v-1.5A5.5 5.5 0 0 1 8.5 13h1A5.5 5.5 0 0 1 15 18.5V20M15 14a4.5 4.5 0 0 1 6 4.2V20"/></svg>
  if (type === 'trophy') return <svg {...common}><path d="M8 4h8v4a4 4 0 0 1-8 0V4ZM8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 12v5M8 21h8M9 17h6v4H9z"/></svg>
  return <svg {...common}><circle cx="12" cy="6" r="3"/><circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/><path d="m10.5 8.5-4 7M13.5 8.5l4 7M8 18h8"/></svg>
}

export default function Home() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [fee, setFee] = useState('All')

  useEffect(() => {
    fetch(`${API_URL}/api/events`)
      .then(r => { if (!r.ok) throw new Error('Failed to load events'); return r.json() })
      .then(setEvents)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => events.filter(e => {
    const text = `${e.title} ${e.club || ''} ${e.description || ''}`.toLowerCase()
    return text.includes(search.toLowerCase()) &&
      (category === 'All' || e.category === category) &&
      (fee === 'All' || (fee === 'Free' ? Number(e.entry_fee) === 0 : Number(e.entry_fee) > 0))
  }), [events, search, category, fee])

  return (
    <div className="home-page">
      <section className="hero-shell" aria-labelledby="hero-title">
        <div className="hero-photo" />
        <div className="hero-shade" />
        <div className="hero-orbit hero-orbit-one" />
        <div className="hero-orbit hero-orbit-two" />
        <div className="hero-content">
          <p className="eyebrow"><span /> YOUR CAMPUS EVENT HUB</p>
          <h1 id="hero-title">Discover What’s<br/>Happening on<br/><em>Campus</em></h1>
          <p className="hero-copy">Explore events, connect with communities,<br className="desktop-break"/> and never miss a campus moment.</p>
          <div className="hero-buttons">
            <a href="#discover" className="button-primary">Explore Events <span>→</span></a>
            <a href="#about" className="button-ghost"><span className="play-icon">▶</span> About CampusConnect</a>
          </div>
        </div>
        <div className="hero-caption">THE NATIONAL INSTITUTE OF ENGINEERING <span>·</span> MYSURU</div>
        <div className="hero-bottom-glow" />
      </section>

      <section className="feature-rail" id="campus-pillars" aria-label="CampusConnect features">
        {[
          ['calendar', 'Events', 'Find & Join'],
          ['clubs', 'Clubs', 'Be a Part'],
          ['trophy', 'Competitions', 'Show Your Talent'],
          ['community', 'Community', 'Connect Together'],
        ].map(([icon, title, subtitle]) => (
          <a href="#discover" className="feature-item" key={title}>
            <span className="feature-icon"><FeatureIcon type={icon}/></span>
            <span><strong>{title}</strong><small>{subtitle}</small></span>
          </a>
        ))}
        <p className="feature-tagline">Discover. Connect. Participate.</p>
      </section>

      <section className="events-section" id="discover">
        <div className="section-heading">
          <div>
            <p className="section-kicker">FIND YOUR NEXT EXPERIENCE</p>
            <h2>Upcoming Events</h2>
            <p className="section-subtitle">Don’t miss out on what’s happening next.</p>
          </div>
          <span className="event-count">{events.length} {events.length === 1 ? 'event' : 'events'} listed</span>
        </div>

        <div className="event-filters">
          <label className="search-field">
            <span className="sr-only">Search events</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events, clubs or keywords..." />
          </label>
          <select aria-label="Filter by category" value={category} onChange={e => setCategory(e.target.value)}>
            {categories.map(c => <option key={c} value={c}>{c === 'All' ? 'All categories' : c}</option>)}
          </select>
          <select aria-label="Filter by entry fee" value={fee} onChange={e => setFee(e.target.value)}>
            <option>All</option><option>Free</option><option>Paid</option>
          </select>
        </div>

        {loading && <p className="empty-state">Loading campus events...</p>}
        {error && <div className="error-state">{error}. Make sure the API and database are running.</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state"><span>✦</span><h3>No events found</h3><p>Try changing your search or filters, or check back soon.</p></div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <div className="event-grid">{filtered.map(event => <EventCard key={event.id} event={event}/>)}</div>
        )}
      </section>

      <section className="about-strip" id="about">
        <div className="about-mark">C<span>+</span></div>
        <div><p className="section-kicker">MADE FOR CAMPUS LIFE</p><h2>One place for every campus moment.</h2><p>CampusConnect brings student events into one easy-to-explore space — from discovering an event to reserving your place.</p></div>
      </section>
    </div>
  )
}
