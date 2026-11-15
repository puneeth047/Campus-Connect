import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const fallback = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=85'
export default function Register() {
  const { eventId } = useParams(); const navigate = useNavigate()
  const [event, setEvent] = useState(null); const [form, setForm] = useState({ student_name: '', student_email: '', usn: '', branch: '', section: '' })
  const [status, setStatus] = useState('idle'); const [message, setMessage] = useState(''); const [registration, setRegistration] = useState(null)
  useEffect(() => { fetch(`${API_URL}/api/events/${eventId}`).then(r => { if (!r.ok) throw new Error('Event not found'); return r.json() }).then(setEvent).catch(e => { setStatus('error'); setMessage(e.message) }) }, [eventId])
  async function handleSubmit(e) {
    e.preventDefault(); setStatus('loading'); setMessage('')
    try {
      const res = await fetch(`${API_URL}/api/registrations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_id: Number(eventId), student_name: form.student_name.trim(), student_email: form.student_email.trim(), usn: form.usn.trim(), branch: form.branch.trim(), section: form.section.trim() }) })
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Registration failed')
      setRegistration({ ...data.registration, ticket: data.ticket, email: data.email }); setStatus('success'); setMessage('Your place is confirmed. Save this QR ticket and show it at the event entrance.')
    } catch (err) { setStatus('error'); setMessage(err.message) }
  }
  if (!event && status !== 'error') return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-ink-muted">Loading event details...</div>
  if (!event) return <div className="mx-auto max-w-xl px-4 py-20 text-center"><p className="text-red-600">{message}</p><Link className="mt-4 inline-block text-accent underline" to="/">Back to events</Link></div>
  const date = new Date(`${String(event.event_date).slice(0,10)}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
    <Link to="/" className="mb-6 inline-flex text-sm font-semibold text-accent hover:underline">← Back to events</Link>
    <div className="grid overflow-hidden rounded-3xl border border-line bg-white shadow-card lg:grid-cols-[1.05fr_.95fr]">
      <div className="bg-primary text-white">
        <div className="relative flex min-h-[300px] items-center justify-center bg-[#031b18] p-3 sm:min-h-[380px] lg:h-full lg:min-h-[620px]"><img src={event.image_url || fallback} alt={`${event.title} poster`} className="max-h-[620px] w-full object-contain" onError={e => { e.currentTarget.src = fallback }}/><div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent"/><div className="absolute bottom-0 p-6 sm:p-8"><span className="mb-3 inline-block rounded-full bg-emerald-400 px-3 py-1 text-xs font-bold text-primary">{event.category || 'Campus event'}</span><h1 className="text-3xl font-extrabold sm:text-4xl">{event.title}</h1><p className="mt-2 text-sm text-white/80">Organised by {event.club || 'NIE Campus'}</p></div></div>
        <div className="grid grid-cols-2 gap-4 p-6 sm:p-8 lg:hidden"><div><p className="text-xs text-white/60">DATE & TIME</p><p className="mt-1 text-sm font-semibold">{date}<br/>{event.event_time || 'Time TBA'}</p></div><div><p className="text-xs text-white/60">ENTRY FEE</p><p className="mt-1 text-2xl font-extrabold">{Number(event.entry_fee) === 0 ? 'FREE' : `₹${Number(event.entry_fee).toLocaleString('en-IN')}`}</p></div><div className="col-span-2"><p className="text-xs text-white/60">VENUE</p><p className="mt-1 text-sm font-semibold">📍 {event.venue || 'To be announced'}</p></div></div>
      </div>
      <div className="p-6 sm:p-8">
        <div className="mb-6 hidden grid-cols-2 gap-4 rounded-2xl bg-surface p-4 lg:grid"><div><p className="text-xs font-semibold text-ink-muted">DATE & TIME</p><p className="mt-1 text-sm font-bold text-primary">{date}<br/>{event.event_time || 'Time TBA'}</p></div><div><p className="text-xs font-semibold text-ink-muted">ENTRY FEE</p><p className="mt-1 text-2xl font-extrabold text-accent">{Number(event.entry_fee) === 0 ? 'FREE' : `₹${Number(event.entry_fee).toLocaleString('en-IN')}`}</p></div><div className="col-span-2"><p className="text-xs font-semibold text-ink-muted">VENUE</p><p className="mt-1 text-sm font-bold text-primary">📍 {event.venue || 'To be announced'}</p></div></div>
        <h2 className="text-2xl font-extrabold text-primary">{status === 'success' ? 'You’re on the list!' : 'Reserve your spot'}</h2>
        <p className="mt-2 text-sm leading-6 text-ink-muted">{status === 'success' ? message : (event.description || 'Complete the details below to register for this campus event.')}</p>
        {status === 'success' ? <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-2xl text-white">✓</div><h3 className="font-bold text-emerald-900">Registration confirmed</h3><p className="mt-2 text-sm text-emerald-800">{registration?.student_name} · {registration?.student_email}</p><p className="mt-1 text-xs text-emerald-700">Registration ID: #{registration?.id}</p>
          {registration?.ticket?.qr_data_url && <div className="mt-5 rounded-xl border border-emerald-200 bg-white p-4 text-center"><img src={registration.ticket.qr_data_url} alt="Your unique CampusConnect QR ticket" className="mx-auto h-52 w-52 max-w-full"/><p className="mt-2 font-mono text-sm font-bold tracking-wider text-emerald-900">{registration.ticket.ticket_code}</p><a href={registration.ticket.qr_data_url} download={`CampusConnect-${registration.ticket.ticket_code}.png`} className="mt-3 inline-flex rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white">Download QR ticket</a><p className="mt-3 text-xs text-emerald-800">{registration.email?.sent ? 'Ticket also sent to your email.' : 'Email not sent yet. Download this QR and keep it safe.'}</p></div>}
          <button onClick={() => navigate('/my-events')} className="mt-5 mr-2 rounded-xl border border-emerald-700 px-4 py-3 text-sm font-semibold text-emerald-900">My events</button><button onClick={() => navigate('/')} className="mt-5 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white">Explore more events</button></div> : <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div><label className="mb-1.5 block text-sm font-semibold text-primary">Full name *</label><input required value={form.student_name} onChange={e => setForm({...form, student_name:e.target.value})} placeholder="Enter your full name" className="w-full rounded-xl border border-line px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"/></div>
          <div><label className="mb-1.5 block text-sm font-semibold text-primary">USN *</label><input required value={form.usn} onChange={e => setForm({...form, usn:e.target.value})} placeholder="e.g. 4NI23CS001" className="w-full rounded-xl border border-line px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 uppercase"/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1.5 block text-sm font-semibold text-primary">Branch *</label><input required value={form.branch} onChange={e => setForm({...form, branch:e.target.value})} placeholder="e.g. CSE" className="w-full rounded-xl border border-line px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"/></div>
            <div><label className="mb-1.5 block text-sm font-semibold text-primary">Section *</label><input required value={form.section} onChange={e => setForm({...form, section:e.target.value})} placeholder="e.g. A" className="w-full rounded-xl border border-line px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 uppercase"/></div>
          </div>
          <div><label className="mb-1.5 block text-sm font-semibold text-primary">College email *</label><input required type="email" value={form.student_email} onChange={e => setForm({...form, student_email:e.target.value})} placeholder="you@example.com" className="w-full rounded-xl border border-line px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"/></div>
          {status === 'error' && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>}
          <button disabled={status === 'loading' || Number(event.registered_count || 0) >= Number(event.capacity || 100)} className="w-full rounded-xl bg-accent px-5 py-3.5 text-sm font-bold text-white transition hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-60">{status === 'loading' ? 'Confirming registration...' : 'Confirm my registration →'}</button>
          <p className="text-center text-xs text-ink-muted">By registering, you agree to follow the event guidelines.</p>
        </form>}
      </div>
    </div>
  </div>
}
