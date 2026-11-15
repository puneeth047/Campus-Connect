import { Link, useLocation } from 'react-router-dom'

const links = [
  { label: 'Home', to: '/' },
  { label: 'Events', to: '/#discover' },
  { label: 'Clubs', to: '/#campus-pillars' },
  { label: 'About', to: '/#about' },
  { label: 'My Events', to: '/my-events' },
]

export default function Navbar() {
  const location = useLocation()
  const active = (to) => to === '/' ? location.pathname === '/' : false

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="brand" aria-label="CampusConnect home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none">
              <path d="M29.5 7.5a17.2 17.2 0 1 0 10.8 27.2" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
              <path d="M25 15.5a9.2 9.2 0 1 0 6.2 15.9" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
              <path d="m31 5 8 1-1 8M23 24h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span className="brand-name">Campus<span>Connect</span></span>
        </Link>

        <nav className="desktop-nav" aria-label="Main navigation">
          <Link className={active('/') ? 'nav-link active' : 'nav-link'} to="/">Home</Link>
          <a className="nav-link" href="/#discover">Events</a>
          <a className="nav-link" href="/#campus-pillars">Clubs</a>
          <a className="nav-link" href="/#about">About</a>
          <Link className={location.pathname === '/admin' ? 'nav-link active' : 'nav-link'} to="/admin">Admin</Link>
        </nav>

        <div className="header-actions">
          <a className="header-search" href="/#discover" aria-label="Search events">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>
            <span>Search events...</span>
          </a>
          <Link to="/scanner" className="login-link">Scanner</Link><Link to="/admin" className="login-link"><span className="login-icon">↗</span> Admin</Link>
        </div>
      </div>
    </header>
  )
}
