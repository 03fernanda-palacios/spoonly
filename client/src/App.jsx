import { useState, useEffect } from 'react'
import useMockTransactions, { deriveSpendingContext } from './hooks/useMockTransactions'

// ── Constants ──────────────────────────────────────────────────────────────────

const INDIGO = '#6366f1'
const INDIGO_DIM = 'rgba(99,102,241,0.12)'

const DIET_OPTIONS = ['omnivore', 'vegetarian', 'vegan', 'pescatarian', 'keto', 'halal', 'kosher']

const DEMO_EVENTS = (() => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const d = tomorrow.toISOString().slice(0, 10)
  const t = (h, m) => ({ dateTime: `${d}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00` })
  return [
    { summary: 'Sprint Planning',       start: t(9,0),  end: t(10,30) },
    { summary: '1:1 with Manager',      start: t(11,0), end: t(11,30) },
    { summary: 'Lunch & Learn',         start: t(12,0), end: t(13,0)  },
    { summary: 'Product Review',        start: t(14,0), end: t(15,30) },
    { summary: 'Design Sync',           start: t(16,0), end: t(17,0)  },
    { summary: 'Stakeholder Demo Prep', start: t(17,0), end: t(18,30) },
  ]
})()

const NEIGHBORS = [
  { id: 'maria', emoji: '👩‍🍳', name: 'Maria', food: 'Chicken tortilla soup',       description: 'Slow-cooked 4hrs',               portions: 3, priceRange: '$9–$14',  color: '#f97316' },
  { id: 'james', emoji: '🧔',  name: 'James', food: 'Sourdough + hummus board',     description: 'Fresh baked this morning',        portions: 2, priceRange: '$12–$18', color: '#eab308' },
  { id: 'linda', emoji: '👵',  name: 'Linda', food: 'Vegetable curry with rice',    description: 'Family recipe, very gentle spices', portions: 4, priceRange: '$8–$13',  color: '#22c55e' },
  { id: 'priya', emoji: '👩‍🦱', name: 'Priya', food: 'Mango lassi + samosas (3pc)', description: 'Just made, still warm',           portions: 5, priceRange: '$7–$11',  color: '#a855f7' },
]

// ── Shared style helpers ───────────────────────────────────────────────────────

const s = {
  page: {
    minHeight: '100svh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
    fontFamily: "'Inter', system-ui, sans-serif",
    boxSizing: 'border-box',
  },
  card: {
    background: 'var(--bg, #fff)',
    border: '1px solid var(--border, #e5e4e7)',
    borderRadius: 16,
    padding: '2rem',
    width: '100%',
    maxWidth: 520,
    boxSizing: 'border-box',
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text, #6b6375)',
    marginBottom: 6,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '0.625rem 0.75rem',
    borderRadius: 8,
    border: '1px solid var(--border, #e5e4e7)',
    background: 'var(--bg, #fff)',
    color: 'var(--text-h, #08060d)',
    fontSize: 15,
    outline: 'none',
  },
  btn: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: 10,
    border: 'none',
    background: INDIGO,
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '0.01em',
  },
  btnGhost: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: 10,
    border: `1px solid var(--border, #e5e4e7)`,
    background: 'transparent',
    color: 'var(--text-h, #08060d)',
    fontSize: 15,
    fontWeight: 500,
    cursor: 'pointer',
  },
  fieldGroup: { marginBottom: '1.25rem' },
}

// ── Progress Bar ───────────────────────────────────────────────────────────────

function ProgressBar({ step }) {
  return (
    <div style={{ width: '100%', maxWidth: 520, marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        {['Profile', 'Calendar', 'Neighbors'].map((label, i) => (
          <span key={i} style={{
            fontSize: 12,
            fontWeight: i + 1 <= step ? 600 : 400,
            color: i + 1 <= step ? INDIGO : 'var(--text, #6b6375)',
          }}>
            {label}
          </span>
        ))}
      </div>
      <div style={{ height: 4, background: 'var(--border, #e5e4e7)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${((step - 1) / 2) * 100}%`,
          background: INDIGO,
          borderRadius: 99,
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  )
}

// ── Step 1: Profile ────────────────────────────────────────────────────────────

function StepProfile({ onNext }) {
  const [form, setForm] = useState({ name: '', diet: 'omnivore', allergies: '', goals: '' })

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <>
      <h2 style={{ marginBottom: 4, color: 'var(--text-h, #08060d)' }}>Tell us about yourself</h2>
      <p style={{ fontSize: 14, color: 'var(--text, #6b6375)', marginBottom: '1.5rem' }}>
        Your agent uses this to negotiate smarter on your behalf.
      </p>

      <div style={s.fieldGroup}>
        <label style={s.label}>Name</label>
        <input style={s.input} placeholder="Alex" value={form.name} onChange={set('name')} />
      </div>

      <div style={s.fieldGroup}>
        <label style={s.label}>Diet</label>
        <select style={s.input} value={form.diet} onChange={set('diet')}>
          {DIET_OPTIONS.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
        </select>
      </div>

      <div style={s.fieldGroup}>
        <label style={s.label}>Allergies</label>
        <input style={s.input} placeholder="e.g. peanuts, shellfish (or leave blank)" value={form.allergies} onChange={set('allergies')} />
      </div>

      <div style={s.fieldGroup}>
        <label style={s.label}>Health Goals</label>
        <input style={s.input} placeholder="e.g. save money, eat more protein" value={form.goals} onChange={set('goals')} />
      </div>

      <button
        style={{ ...s.btn, opacity: form.name.trim() ? 1 : 0.5 }}
        disabled={!form.name.trim()}
        onClick={() => onNext(form)}
      >
        Continue →
      </button>
    </>
  )
}

// ── Step 2: Calendar ───────────────────────────────────────────────────────────

function StepCalendar({ onNext }) {
  const [events, setEvents] = useState(null)

  useEffect(() => {
    function handleMessage(e) {
      if (e.data?.type === 'GOOGLE_CALENDAR_EVENTS') setEvents(e.data.events)
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  function connectGoogle() {
    const w = 500, h = 650
    const left = window.screenX + (window.outerWidth - w) / 2
    const top  = window.screenY + (window.outerHeight - h) / 2
    window.open('http://localhost:3001/auth/google', 'Google Calendar Auth',
      `width=${w},height=${h},left=${left},top=${top}`)
  }

  function useDemo() { setEvents(DEMO_EVENTS) }

  const fmt = (dt) => new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const hasLunchGap = events && !events.some(e => {
    const sh = new Date(e.start.dateTime).getHours()
    const eh = new Date(e.end.dateTime).getHours()
    return sh < 14 && eh > 11
  })

  return (
    <>
      <h2 style={{ marginBottom: 4, color: 'var(--text-h, #08060d)' }}>Connect your calendar</h2>
      <p style={{ fontSize: 14, color: 'var(--text, #6b6375)', marginBottom: '1.5rem' }}>
        Your agent checks tomorrow's schedule to find the best lunch window.
      </p>

      {!events ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button style={s.btn} onClick={connectGoogle}>
            <span style={{ marginRight: 8 }}>📅</span> Connect Google Calendar
          </button>
          <button style={s.btnGhost} onClick={useDemo}>
            Use Demo Calendar
          </button>
        </div>
      ) : (
        <>
          {!hasLunchGap && (
            <div style={{
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.4)',
              borderRadius: 8,
              padding: '0.625rem 0.875rem',
              marginBottom: '1rem',
              fontSize: 13,
              color: '#b45309',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span>⚠️</span> No free lunch window detected — agent will prioritize quick meals.
            </div>
          )}

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.25rem' }}>
            {events.map((e, i) => (
              <li key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.5rem 0',
                borderBottom: i < events.length - 1 ? '1px solid var(--border, #e5e4e7)' : 'none',
                fontSize: 14,
              }}>
                <span style={{ color: 'var(--text-h, #08060d)' }}>{e.summary}</span>
                <span style={{ color: 'var(--text, #6b6375)' }}>
                  {fmt(e.start.dateTime)} – {fmt(e.end.dateTime)}
                </span>
              </li>
            ))}
          </ul>

          <button style={s.btn} onClick={() => onNext(events)}>
            Continue →
          </button>
        </>
      )}
    </>
  )
}

// ── Step 3: Neighbors ─────────────────────────────────────────────────────────

function StepNeighbors({ onActivate }) {
  const [included, setIncluded] = useState(() =>
    Object.fromEntries(NEIGHBORS.map(n => [n.id, true]))
  )

  const toggle = (id) => setIncluded(s => ({ ...s, [id]: !s[id] }))
  const selectedNeighbors = NEIGHBORS.filter(n => included[n.id])

  return (
    <>
      <h2 style={{ marginBottom: 4, color: 'var(--text-h, #08060d)' }}>Meet your neighbors</h2>
      <p style={{ fontSize: 14, color: 'var(--text, #6b6375)', marginBottom: '1.5rem' }}>
        Your agent will negotiate with each selected neighbor simultaneously.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1.5rem' }}>
        {NEIGHBORS.map(n => {
          const on = included[n.id]
          return (
            <div key={n.id} style={{
              border: `1.5px solid ${on ? n.color : 'var(--border, #e5e4e7)'}`,
              borderRadius: 12,
              padding: '0.875rem',
              background: on ? `${n.color}10` : 'transparent',
              transition: 'all 0.2s',
              cursor: 'pointer',
              textAlign: 'left',
            }} onClick={() => toggle(n.id)}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>{n.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-h, #08060d)', marginBottom: 2 }}>{n.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-h, #08060d)', marginBottom: 2 }}>{n.food}</div>
              <div style={{ fontSize: 12, color: 'var(--text, #6b6375)', marginBottom: 6 }}>{n.description}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                <span style={{ color: n.color, fontWeight: 600 }}>{n.priceRange}</span>
                <span style={{ color: 'var(--text, #6b6375)' }}>{n.portions} left</span>
              </div>
              <div style={{
                marginTop: 8,
                fontSize: 11,
                fontWeight: 600,
                color: on ? n.color : 'var(--text, #6b6375)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <span style={{
                  width: 12, height: 12,
                  borderRadius: '50%',
                  background: on ? n.color : 'transparent',
                  border: `2px solid ${on ? n.color : 'var(--text, #6b6375)'}`,
                  display: 'inline-block',
                  flexShrink: 0,
                }} />
                {on ? 'Include in negotiation' : 'Excluded'}
              </div>
            </div>
          )
        })}
      </div>

      <button
        style={{ ...s.btn, opacity: selectedNeighbors.length ? 1 : 0.5 }}
        disabled={!selectedNeighbors.length}
        onClick={() => onActivate(selectedNeighbors)}
      >
        ⚡ Activate My Agent ({selectedNeighbors.length} neighbor{selectedNeighbors.length !== 1 ? 's' : ''})
      </button>
    </>
  )
}

// ── App ────────────────────────────────────────────────────────────────────────

export default function App() {
  const transactions = useMockTransactions()
  const [step, setStep]             = useState(1)
  const [profile, setProfile]       = useState(null)
  const [calendarEvents, setCalendar] = useState(null)
  const [neighbors, setNeighbors]   = useState(null)

  console.log('[spending context]', deriveSpendingContext(transactions))

  function handleProfile(data) { setProfile(data); setStep(2) }
  function handleCalendar(events) { setCalendar(events); setStep(3) }
  function handleActivate(selected) {
    setNeighbors(selected)
    // TODO: advance to negotiation dashboard
    console.log('[launch negotiation]', { profile, calendarEvents, transactions, neighbors: selected })
  }

  return (
    <div style={s.page}>
      <div style={{ width: '100%', maxWidth: 520, marginBottom: '0.5rem', textAlign: 'left' }}>
        <span style={{ fontWeight: 800, fontSize: 18, color: INDIGO, letterSpacing: '-0.02em' }}>spoonly</span>
      </div>

      <ProgressBar step={step} />

      <div style={s.card}>
        {step === 1 && <StepProfile onNext={handleProfile} />}
        {step === 2 && <StepCalendar onNext={handleCalendar} />}
        {step === 3 && <StepNeighbors onActivate={handleActivate} />}
      </div>

      <p style={{ marginTop: '1rem', fontSize: 12, color: 'var(--text, #6b6375)' }}>
        Powered by NVIDIA Nemotron Ultra 253B
      </p>
    </div>
  )
}
