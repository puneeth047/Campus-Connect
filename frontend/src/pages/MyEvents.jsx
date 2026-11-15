import { useState } from 'react'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
export default function MyEvents() {
  const [email,setEmail]=useState('')
  const [items,setItems]=useState([])
  const [state,setState]=useState('idle')
  const [message,setMessage]=useState('')
  async function lookup(e) {
    e.preventDefault(); setState('loading'); setMessage('')
    try {
      const r=await fetch(`${API_URL}/api/registrations/my?email=${encodeURIComponent(email.trim())}`)
      const data=await r.json(); if(!r.ok) throw new Error(data.error||'Could not find registrations')
      setItems(data); setState('done'); if(!data.length) setMessage('No registrations found for this email address.')
    } catch(err) { setState('error'); setMessage(err.message) }
  }
  return <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
    <p className="text-xs font-bold uppercase tracking-[.2em] text-accent">YOUR CAMPUS PASSES</p>
    <h1 className="mt-2 text-3xl font-extrabold text-primary">My Registered Events</h1>
    <p className="mt-2 text-sm text-ink-muted">Enter the email you used during registration to view your event bookings.</p>
    <form onSubmit={lookup} className="mt-7 flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:flex-row">
      <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Your registration email" className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 py-3 text-sm outline-none focus:border-accent"/>
      <button disabled={state==='loading'} className="rounded-xl bg-accent px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{state==='loading'?'Searching...':'Find my events'}</button>
    </form>
    {message && <p className={`mt-4 rounded-xl p-4 text-sm ${state==='error'?'bg-red-950/40 text-red-300':'bg-surface text-ink-muted'}`}>{message}</p>}
    <div className="mt-6 grid gap-4">
      {items.map(x=><article key={x.registration_id} className="rounded-2xl border border-line bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-accent">{x.event_date?.toString().slice(0,10)}</p><h2 className="mt-1 text-xl font-extrabold text-primary">{x.event_title}</h2><p className="mt-1 text-sm text-ink-muted">{x.venue||'Venue TBA'} · {x.event_time||'Time TBA'}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${x.checked_in?'bg-emerald-500/15 text-emerald-300':'bg-teal-500/10 text-teal-200'}`}>{x.checked_in?'Checked in':'Registered'}</span></div>
        <p className="mt-4 text-xs text-ink-muted">Registration #{x.registration_id} · Ticket #{x.ticket_id||'Pending'}</p>
        <p className="mt-2 text-xs text-ink-muted">Your original QR ticket is shown on the registration confirmation screen and in the ticket email. If you lose it, contact the event organizer.</p>
      </article>)}
    </div>
  </div>
}
