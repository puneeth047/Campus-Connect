
import { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const TOKEN_KEY = 'campusconnect_organizer_token'

const blank = {
  title: '',
  description: '',
  club: '',
  venue: '',
  event_date: '',
  event_time: '',
  image_url: '',
  category: 'Technical',
  entry_fee: '0',
  capacity: '100'
}

const fallback = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=85'

export default function Admin() {
  const [events, setEvents] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [form, setForm] = useState(blank)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)

  // Organizer authentication and PDF download
  const [organizerToken, setOrganizerToken] = useState(
    () => localStorage.getItem(TOKEN_KEY) || ''
  )
  const [reportingId, setReportingId] = useState(null)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    try {
      setLoading(true)

      const [er, rr] = await Promise.all([
        fetch(`${API_URL}/api/events`),
        fetch(`${API_URL}/api/registrations`)
      ])

      if (!er.ok) throw new Error('Could not load events')

      setEvents(await er.json())

      if (rr.ok) setRegistrations(await rr.json())
    } catch (e) {
      setMessage({
        type: 'error',
        text: e.message || 'Failed to load dashboard'
      })
    } finally {
      setLoading(false)
    }
  }

  async function submit(e) {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      const r = await fetch(`${API_URL}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          entry_fee: Number(form.entry_fee),
          capacity: Number(form.capacity)
        })
      })

      const data = await r.json()

      if (!r.ok) throw new Error(data.error || 'Could not create event')

      setMessage({
        type: 'success',
        text: 'Event published successfully!'
      })

      setForm(blank)
      await refresh()
    } catch (e) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(id) {
    if (!window.confirm('Delete this event and its registrations?')) return

    try {
      const r = await fetch(`${API_URL}/api/events/${id}`, {
        method: 'DELETE'
      })

      if (!r.ok) throw new Error('Delete failed')

      setMessage({ type: 'success', text: 'Event deleted' })
      await refresh()
    } catch (e) {
      setMessage({ type: 'error', text: e.message })
    }
  }

  // Download attendance PDF for a selected event
  async function downloadReport(eventId) {
    const token = localStorage.getItem(TOKEN_KEY)

    if (!token) {
      setOrganizerToken('')
      setMessage({
        type: 'error',
        text: 'Please log in as organizer through the QR scanner first.'
      })
      return
    }

    setReportingId(eventId)
    setMessage(null)

    try {
      const r = await fetch(
        `${API_URL}/api/attendance/event/${eventId}/report`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (!r.ok) {
        let data = {}
        try {
          data = await r.json()
        } catch {}

        if (r.status === 401) {
          setOrganizerToken('')
        }

        throw new Error(
          data.error || 'Could not download attendance report.'
        )
      }

      const blob = await r.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = `CampusConnect_Attendance_${eventId}.pdf`

      document.body.appendChild(link)
      link.click()
      link.remove()

      window.URL.revokeObjectURL(url)

      setMessage({
        type: 'success',
        text: 'Attendance PDF downloaded successfully!'
      })
    } catch (e) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setReportingId(null)
    }
  }

  const update = (key, value) =>
    setForm(prev => ({ ...prev, [key]: value }))

  function handlePosterFile(file) {
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please choose an image file.' })
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage({
        type: 'error',
        text: 'Poster must be 2 MB or smaller.'
      })
      return
    }

    const reader = new FileReader()

    reader.onload = () => update('image_url', reader.result)
    reader.onerror = () =>
      setMessage({ type: 'error', text: 'Could not read that image.' })

    reader.readAsDataURL(file)
  }

  const input =
    'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10'

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-accent">
          CAMPUSCONNECT CONTROL ROOM
        </p>

        <h1 className="mt-2 text-3xl font-extrabold text-primary sm:text-4xl">
          Admin dashboard
        </h1>

        <p className="mt-2 text-sm text-ink-muted">
          Publish events, manage registrations and keep students in the loop.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/scanner"
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white"
          >
            Open QR scanner →
          </a>

          <a
            href="/my-events"
            className="rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-primary"
          >
            Student My Events
          </a>
        </div>
      </div>

      {message && (
        <div
          className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          ['Events published', events.length, '📅'],
          ['Student registrations', registrations.length, '🎟️'],
          [
            'Paid events',
            events.filter(e => Number(e.entry_fee) > 0).length,
            '💳'
          ]
        ].map(([label, value, icon]) => (
          <div
            key={label}
            className="rounded-2xl border border-line bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-muted">{label}</span>
              <span className="text-2xl">{icon}</span>
            </div>

            <p className="mt-2 text-3xl font-extrabold text-primary">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr]">

        {/* Create event form */}
        <form
          onSubmit={submit}
          className="h-fit rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6"
        >
          <div className="mb-5">
            <h2 className="text-xl font-bold text-primary">
              ＋ Create a new event
            </h2>
            <p className="mt-1 text-xs text-ink-muted">
              Add the poster and event information students will see.
            </p>
          </div>

          <div className="mb-5 overflow-hidden rounded-xl bg-surface">
            <img
              src={form.image_url || fallback}
              alt="Event poster preview"
              className="h-40 w-full object-cover"
              onError={e => { e.currentTarget.src = fallback }}
            />
          </div>

          <div className="space-y-4">

            <div>
              <label className="mb-1.5 block text-xs font-bold text-primary">
                Event title *
              </label>
              <input
                required
                className={input}
                value={form.title}
                onChange={e => update('title', e.target.value)}
                placeholder="e.g. CodeStorm Hackathon"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-primary">
                Upload event poster
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={e => handlePosterFile(e.target.files?.[0])}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:font-semibold file:text-white"
              />

              <p className="mt-1 text-[11px] text-ink-muted">
                Choose JPG, PNG or WebP · maximum 2 MB.
              </p>

              <label className="mb-1.5 mt-3 block text-xs font-bold text-primary">
                Or paste a poster image URL
              </label>

              <input
                type="url"
                className={input}
                value={form.image_url.startsWith('data:') ? '' : form.image_url}
                onChange={e => update('image_url', e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-primary">
                Description
              </label>
              <textarea
                rows="3"
                className={input}
                value={form.description}
                onChange={e => update('description', e.target.value)}
                placeholder="What will students experience?"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-primary">
                  Club / Organizer
                </label>
                <input
                  className={input}
                  value={form.club}
                  onChange={e => update('club', e.target.value)}
                  placeholder="Coding Club"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-primary">
                  Category
                </label>
                <select
                  className={input}
                  value={form.category}
                  onChange={e => update('category', e.target.value)}
                >
                  {['Technical', 'Cultural', 'Workshop', 'Sports', 'Other'].map(x => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-primary">
                  Event date *
                </label>
                <input
                  required
                  type="date"
                  className={input}
                  value={form.event_date}
                  onChange={e => update('event_date', e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-primary">
                  Time
                </label>
                <input
                  className={input}
                  value={form.event_time}
                  onChange={e => update('event_time', e.target.value)}
                  placeholder="10:00 AM"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-primary">
                Venue
              </label>
              <input
                className={input}
                value={form.venue}
                onChange={e => update('venue', e.target.value)}
                placeholder="Main Auditorium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-primary">
                  Entry fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={input}
                  value={form.entry_fee}
                  onChange={e => update('entry_fee', e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-primary">
                  Seat capacity
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  className={input}
                  value={form.capacity}
                  onChange={e => update('capacity', e.target.value)}
                />
              </div>
            </div>

            <button
              disabled={submitting}
              className="w-full rounded-xl bg-accent px-5 py-3 text-sm font-bold text-white transition hover:bg-accent-light disabled:opacity-60"
            >
              {submitting ? 'Publishing...' : 'Publish event →'}
            </button>
          </div>
        </form>

        <div className="space-y-8">

          {/* Your events */}
          <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">

            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-primary">
                  Your events
                </h2>
                <p className="mt-1 text-xs text-ink-muted">
                  Manage published campus events.
                </p>
              </div>

              <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-primary">
                {events.length} total
              </span>
            </div>

            {loading ? (
              <p className="py-8 text-center text-sm text-ink-muted">
                Loading...
              </p>
            ) : events.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-muted">
                No events published yet.
              </p>
            ) : (
              <div className="space-y-3">
                {events.map(ev => (
                  <div
                    key={ev.id}
                    className="flex gap-3 rounded-xl border border-line p-3"
                  >
                    <img
                      src={ev.image_url || fallback}
                      alt=""
                      className="h-20 w-24 rounded-lg object-cover"
                      onError={e => { e.currentTarget.src = fallback }}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">

                        <div>
                          <h3 className="font-bold text-primary">
                            {ev.title}
                          </h3>

                          <p className="mt-1 text-xs text-ink-muted">
                            {ev.event_date?.toString().slice(0, 10)} · {ev.club || 'NIE Campus'}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">

                          {organizerToken && (
                            <button
                              type="button"
                              disabled={reportingId === ev.id}
                              onClick={() => downloadReport(ev.id)}
                              className="text-xs font-semibold text-accent hover:underline disabled:opacity-50"
                            >
                              {reportingId === ev.id
                                ? 'Preparing PDF...'
                                : 'Download PDF'}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => remove(ev.id)}
                            className="text-xs font-semibold text-red-600 hover:underline"
                          >
                            Delete
                          </button>

                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                        <span className="rounded-full bg-surface px-2 py-1">
                          {ev.category}
                        </span>

                        <span className="rounded-full bg-surface px-2 py-1">
                          {Number(ev.entry_fee) === 0 ? 'Free' : `₹${ev.entry_fee}`}
                        </span>

                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-800">
                          {ev.registered_count || 0}/{ev.capacity} registered
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent registrations */}
          <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">

            <div className="mb-4">
              <h2 className="text-xl font-bold text-primary">
                Recent registrations
              </h2>
              <p className="mt-1 text-xs text-ink-muted">
                Students who have booked their spots.
              </p>
            </div>

            {registrations.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-muted">
                No registrations yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs text-ink-muted">
                      <th className="pb-3 pr-3">Student</th>
                      <th className="pb-3 pr-3">USN / Branch</th>
                      <th className="pb-3 pr-3">Event</th>
                      <th className="pb-3">Email</th>
                      <th className="pb-3">Attendance</th>
                    </tr>
                  </thead>

                  <tbody>
                    {registrations.slice(0, 12).map(r => (
                      <tr key={r.id} className="border-b border-line/70">
                        <td className="py-3 pr-3 font-semibold text-primary">
                          {r.student_name}
                        </td>

                        <td className="py-3 pr-3 text-xs text-ink-muted">
                          {r.usn || '—'}
                          {r.branch ? ` · ${r.branch}` : ''}
                          {r.section ? `-${r.section}` : ''}
                        </td>

                        <td className="py-3 pr-3 text-ink-muted">
                          {r.event_title}
                        </td>

                        <td className="py-3 text-xs text-ink-muted">
                          {r.student_email}
                        </td>

                        <td className="py-3 text-xs">
                          {r.checked_in ? (
                            <span className="font-bold text-emerald-600">
                              Checked in
                            </span>
                          ) : (
                            <span className="text-ink-muted">
                              Not arrived
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  )
}
