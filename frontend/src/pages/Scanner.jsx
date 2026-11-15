import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const TOKEN_KEY = 'campusconnect_organizer_token'

export default function Scanner() {
  const scannerRef = useRef(null)
  const verifyingRef = useRef(false)

  const [authChecked, setAuthChecked] = useState(false)
  const [configured, setConfigured] = useState(true)
  const [configMessage, setConfigMessage] = useState('')
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '')
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [loginBusy, setLoginBusy] = useState(false)

  const [running, setRunning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [organizer, setOrganizer] = useState('Organizer')
  const [events, setEvents] = useState([])
  const [eventId, setEventId] = useState('')
  const [manual, setManual] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API_URL}/api/auth/status`)
      .then(r => r.json())
      .then(data => {
        setConfigured(Boolean(data.configured))
        if (!data.configured) setConfigMessage(data.message || 'Organizer login is not configured.')
      })
      .catch(() => {
        setConfigured(false)
        setConfigMessage('Could not reach the API. Is the backend running?')
      })
      .finally(() => setAuthChecked(true))
  }, [])

  useEffect(() => {
    if (!token) return
    fetch(`${API_URL}/api/events`)
      .then(r => r.json())
      .then(rows => {
        setEvents(rows)
        if (rows.length) setEventId(String(rows[0].id))
      })
      .catch(() => setError('Could not load events. Check the API connection.'))
  }, [token])

  async function handleLogin(e) {
    e.preventDefault()
    setLoginBusy(true)
    setLoginError('')
    try {
      const r = await fetch(`${API_URL}/api/auth/organizer-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginForm.email.trim(), password: loginForm.password })
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Login failed')
      localStorage.setItem(TOKEN_KEY, data.token)
      setToken(data.token)
      setOrganizer(data.organizer?.name || 'Organizer')
    } catch (err) {
      setLoginError(err.message)
    } finally {
      setLoginBusy(false)
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    setToken('')
    stopScanner()
    setResult(null)
  }

  async function verify(payload) {
    if (verifyingRef.current) return
    verifyingRef.current = true
    setBusy(true)
    setError('')
    try {
      const r = await fetch(`${API_URL}/api/attendance/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          qr_payload: payload,
          organizer,
          event_id: Number(eventId)
        })
      })
      const data = await r.json()
      setResult({ ...data, httpStatus: r.status })
      if (r.ok || r.status === 409) await stopScanner()
    } catch (e) {
      setError('Could not reach the server. Check the API connection and try again.')
    } finally {
      verifyingRef.current = false
      setBusy(false)
    }
  }

  async function startScanner() {
    setError('')
    setResult(null)
    try {
      const scanner = new Html5Qrcode('campusconnect-qr-reader')
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decoded) => verify(decoded),
        () => {}
      )
      setRunning(true)
    } catch (e) {
      setError('Camera could not start. Allow camera permission and use HTTPS (localhost is allowed for development).')
      scannerRef.current = null
    }
  }

  async function stopScanner() {
    const scanner = scannerRef.current
    if (scanner) {
      try {
        if (scanner.isScanning) await scanner.stop()
        await scanner.clear()
      } catch (e) {}
      scannerRef.current = null
    }
    setRunning(false)
  }

  useEffect(() => () => {
    const s = scannerRef.current
    if (s?.isScanning) s.stop().catch(() => {})
  }, [])

  if (!authChecked) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center text-ink-muted">
        Checking organizer access...
      </div>
    )
  }

  if (!configured) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center px-4">
        <div className="w-full rounded-2xl border border-line bg-surface/80 p-8 text-center shadow-card">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-accent">CAMPUSCONNECT ORGANIZER</p>
          <h1 className="mt-3 text-2xl font-extrabold text-primary">Organizer login</h1>
          <p className="mt-4 rounded-xl bg-red-950/40 p-4 text-left text-sm text-red-300">
            {configMessage}
          </p>
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center px-4">
        <div className="w-full rounded-2xl border border-emerald-800/40 bg-[#0a2e28] p-8 shadow-card">
          <p className="text-center text-xs font-bold uppercase tracking-[.2em] text-emerald-400">
            CAMPUSCONNECT ORGANIZER
          </p>
          <h1 className="mt-2 text-center text-2xl font-extrabold text-white">Organizer login</h1>
          <p className="mt-2 text-center text-sm text-emerald-100/70">
            Sign in to access event attendance scanning.
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-emerald-200">Email</label>
              <input
                type="email"
                required
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                placeholder="organizer@example.com"
                className="w-full rounded-xl border border-emerald-700/50 bg-emerald-950/40 px-4 py-3 text-sm text-white outline-none placeholder:text-emerald-500 focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-emerald-200">Password</label>
              <input
                type="password"
                required
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="••••••••"
                className="w-full rounded-xl border border-emerald-700/50 bg-emerald-950/40 px-4 py-3 text-sm text-white outline-none placeholder:text-emerald-500 focus:border-emerald-400"
              />
            </div>

            {loginError && (
              <p className="rounded-xl bg-red-950/50 px-4 py-3 text-sm text-red-300">{loginError}</p>
            )}

            <button
              type="submit"
              disabled={loginBusy}
              className="w-full rounded-xl bg-emerald-400 px-5 py-3.5 text-sm font-bold text-emerald-950 transition hover:bg-emerald-300 disabled:opacity-60"
            >
              {loginBusy ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-accent">ORGANIZER TOOL</p>
        <button
          onClick={logout}
          className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-primary"
        >
          Log out
        </button>
      </div>
      <h1 className="mt-2 text-3xl font-extrabold text-primary">QR Attendance Scanner</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Open this page on the organizer’s phone, allow camera access and scan a student’s CampusConnect ticket.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white p-5">
          <label className="mb-2 block text-sm font-semibold text-primary">Event to check in</label>
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="mb-4 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"
          >
            {events.length === 0 && <option value="">No events yet</option>}
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>

          <label className="mb-2 block text-sm font-semibold text-primary">Organizer name</label>
          <input
            value={organizer}
            onChange={(e) => setOrganizer(e.target.value)}
            className="mb-4 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"
            placeholder="Your name"
          />

          <div id="campusconnect-qr-reader" className="overflow-hidden rounded-xl" />

          {!running ? (
            <button
              onClick={startScanner}
              disabled={!eventId || busy}
              className="mt-4 w-full rounded-xl bg-accent px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              Start camera scanner
            </button>
          ) : (
            <button
              onClick={stopScanner}
              className="mt-4 w-full rounded-xl border border-line px-4 py-3 text-sm font-bold text-primary"
            >
              Stop camera
            </button>
          )}

          <p className="mt-3 text-xs leading-5 text-ink-muted">
            Camera access requires permission. On a deployed site, HTTPS is required. If camera scanning is
            unavailable, paste the QR payload below.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              verify(manual.trim())
            }}
            className="mt-5 border-t border-line pt-4"
          >
            <label className="mb-2 block text-sm font-semibold text-primary">Manual QR payload (fallback)</label>
            <textarea
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              rows="2"
              className="w-full rounded-xl border border-line bg-surface p-3 text-xs"
              placeholder="CAMPUSCONNECT:TICKET:..."
            />
            <button
              disabled={!manual.trim() || busy}
              className="mt-2 rounded-lg border border-accent px-4 py-2 text-xs font-bold text-accent disabled:opacity-50"
            >
              Verify ticket
            </button>
          </form>

          {error && <p className="mt-4 rounded-xl bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
        </section>

        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="text-lg font-bold text-primary">Scan result</h2>
          {!result ? (
            <div className="mt-5 rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-muted">
              <span className="text-3xl text-accent">▦</span>
              <p className="mt-3">Waiting for a ticket scan...</p>
            </div>
          ) : (
            <div
              className={`mt-5 rounded-xl border p-5 ${
                result.valid && !result.already_checked_in
                  ? 'border-emerald-400/40 bg-emerald-500/10'
                  : result.already_checked_in
                  ? 'border-amber-400/40 bg-amber-500/10'
                  : 'border-red-400/40 bg-red-500/10'
              }`}
            >
              <p className="text-sm font-extrabold">{result.message || result.error}</p>
              {result.attendee && (
                <>
                  <h3 className="mt-4 text-2xl font-extrabold text-primary">{result.attendee.student_name}</h3>
                  <p className="mt-1 break-all text-sm text-ink-muted">{result.attendee.student_email}</p>
                  <p className="mt-4 text-sm font-semibold text-primary">{result.attendee.event_title}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {result.attendee.venue || 'Venue TBA'} · {String(result.attendee.event_date || '').slice(0, 10)}
                  </p>
                </>
              )}
              {result.checked_in_at && (
                <p className="mt-4 text-xs text-ink-muted">
                  Checked in: {new Date(result.checked_in_at).toLocaleString()}
                </p>
              )}
            </div>
          )}
          <button
            onClick={() => {
              setResult(null)
              setError('')
              setManual('')
              if (!running) startScanner()
            }}
            className="mt-4 w-full rounded-xl border border-line px-4 py-3 text-sm font-bold text-primary"
          >
            Ready for next student
          </button>
        </section>
      </div>
    </div>
  )
}
