import { useState, useEffect, useRef } from 'react'

// ── Inject keyframes once ──────────────────────────────────────────────────────
const styleEl = document.createElement('style')
styleEl.textContent = `
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.25; }
  }
  @keyframes dealFlash {
    0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.55); }
    60%  { box-shadow: 0 0 0 14px rgba(34,197,94,0); }
    100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
  }
`
document.head.appendChild(styleEl)

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    waiting:     { label: 'Waiting',        bg: 'rgba(107,114,128,0.12)', color: '#6b7280' },
    negotiating: { label: 'Negotiating...', bg: 'rgba(99,102,241,0.12)',  color: '#6366f1' },
    deal:        { label: 'Deal ✅',         bg: 'rgba(34,197,94,0.12)',   color: '#16a34a' },
    pass:        { label: 'Passed ⛔',       bg: 'rgba(239,68,68,0.12)',   color: '#dc2626' },
    superseded:  { label: 'Stood down',     bg: 'rgba(107,114,128,0.08)', color: '#9ca3af' },
  }
  const cfg = map[status] ?? map.waiting
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: 99,
      background: cfg.bg,
      color: cfg.color,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      whiteSpace: 'nowrap',
    }}>
      {status === 'negotiating' && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#6366f1',
          display: 'inline-block',
          animation: 'pulse 1.2s ease-in-out infinite',
        }} />
      )}
      {cfg.label}
    </span>
  )
}

// ── Message bubble ────────────────────────────────────────────────────────────

function Bubble({ msg, neighborColor }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-start' : 'flex-end',
      marginBottom: 6,
      animation: 'slideIn 200ms ease both',
    }}>
      <div style={{
        maxWidth: '80%',
        padding: '0.5rem 0.75rem',
        borderRadius: isUser ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
        background: isUser ? 'rgba(99,102,241,0.15)' : `${neighborColor}20`,
        color: 'var(--text-h, #08060d)',
        fontSize: 13,
        lineHeight: 1.5,
        borderLeft: isUser ? '3px solid #6366f1' : 'none',
        borderRight: isUser ? 'none' : `3px solid ${neighborColor}`,
      }}>
        {msg.text}
      </div>
    </div>
  )
}

// ── Single negotiation panel ──────────────────────────────────────────────────

function NegotiationPanel({ neighbor, messages, status, turn }) {
  const feedRef = useRef(null)

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [messages.length])

  const isSuperseded = status === 'superseded'
  const isDeal = status === 'deal'

  return (
    <div style={{
      border: `1.5px solid ${isDeal ? '#22c55e' : isSuperseded ? 'var(--border, #e5e4e7)' : `${neighbor.color}44`}`,
      borderRadius: 14,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: 340,
      background: 'var(--bg, #fff)',
      animation: isDeal ? 'dealFlash 0.8s ease' : 'none',
      transition: 'border-color 0.4s ease',
    }}>
      {/* Header */}
      <div style={{
        padding: '0.625rem 0.875rem',
        borderBottom: '1px solid var(--border, #e5e4e7)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
        background: isDeal ? 'rgba(34,197,94,0.06)' : 'transparent',
      }}>
        <span style={{ fontSize: 22 }}>{neighbor.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-h, #08060d)', lineHeight: 1.2 }}>
            {neighbor.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text, #6b6375)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {neighbor.food}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
          <StatusBadge status={status} />
          {status === 'negotiating' && (
            <span style={{ fontSize: 10, color: '#6b7280' }}>Turn {turn}/6</span>
          )}
        </div>
      </div>

      {/* Deal banner */}
      {isDeal && (
        <div style={{
          background: 'rgba(34,197,94,0.12)',
          borderBottom: '1px solid rgba(34,197,94,0.3)',
          padding: '0.4rem 0.875rem',
          fontSize: 12,
          fontWeight: 700,
          color: '#16a34a',
          textAlign: 'center',
          flexShrink: 0,
        }}>
          🎉 Deal Confirmed!
        </div>
      )}

      {/* Superseded banner */}
      {isSuperseded && (
        <div style={{
          background: 'rgba(107,114,128,0.06)',
          borderBottom: '1px solid var(--border, #e5e4e7)',
          padding: '0.4rem 0.875rem',
          fontSize: 12,
          color: '#9ca3af',
          textAlign: 'center',
          flexShrink: 0,
        }}>
          Deal already locked in for today — agent stood down
        </div>
      )}

      {/* Chat feed */}
      <div ref={feedRef} style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {messages.length === 0 && status === 'waiting' && (
          <p style={{ fontSize: 12, color: '#9ca3af', margin: 'auto', textAlign: 'center' }}>
            Waiting to connect...
          </p>
        )}
        {messages.map((msg, i) => (
          <Bubble key={i} msg={msg} neighborColor={neighbor.color} />
        ))}
      </div>
    </div>
  )
}

// ── Summary card ──────────────────────────────────────────────────────────────

function SummaryCard({ total, deals, passes }) {
  return (
    <div style={{
      marginTop: '1.5rem',
      padding: '1.5rem',
      borderRadius: 16,
      border: '1.5px solid #6366f1',
      background: 'rgba(99,102,241,0.06)',
      textAlign: 'center',
      animation: 'slideIn 300ms ease both',
    }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>🤝</div>
      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-h, #08060d)', marginBottom: 6 }}>
        Your agent ran {total} simultaneous negotiation{total !== 1 ? 's' : ''}.
      </p>
      <p style={{ fontSize: 14, color: 'var(--text, #6b6375)', marginBottom: 0 }}>
        <strong style={{ color: '#16a34a' }}>{deals} deal{deals !== 1 ? 's' : ''} closed.</strong>
        {' '}{passes} passed.{' '}
        <strong style={{ color: '#6366f1' }}>Zero effort from you.</strong>
      </p>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function NegotiationDashboard({ profile, calendarEvents, transactions, neighbors }) {
  const [panels, setPanels] = useState(() =>
    Object.fromEntries(neighbors.map(n => [n.id, { messages: [], status: 'waiting', turn: 0 }]))
  )
  const [allDone, setAllDone] = useState(false)
  const doneCount = useRef(0)

  useEffect(() => {
    startNegotiations()
  }, [])

  async function startNegotiations() {
    // Mark all as negotiating
    setPanels(prev => {
      const next = { ...prev }
      neighbors.forEach(n => { next[n.id] = { ...next[n.id], status: 'negotiating' } })
      return next
    })

    const spendingContext = transactions
      ? (() => {
          const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
          const restaurants = transactions.filter(t => t.category?.[1] === 'Restaurants')
          const weeklyAll = transactions.filter(t => new Date(t.date).getTime() >= weekAgo)
          const weeklySpend = weeklyAll.reduce((s, t) => s + t.amount, 0)
          const avg = restaurants.length ? restaurants.reduce((s, t) => s + t.amount, 0) / restaurants.length : 0
          const cafeteria = transactions.filter(t => t.name === 'Office Cafeteria').length
          return `Weekly food spend: $${weeklySpend.toFixed(2)}. Average restaurant meal: $${avg.toFixed(2)}. ${cafeteria >= 3 ? `Frequently eats unsatisfying cafeteria food (${cafeteria}x — eager for better options).` : ''} Comfortable meal budget: ~$${Math.round(avg * 1.1)}.`
        })()
      : ''

    const userProfile = {
      name: profile.name,
      diet: profile.diet,
      allergies: profile.allergies ? profile.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
      goals: profile.goals ? profile.goals.split(',').map(s => s.trim()).filter(Boolean) : [],
    }

    let response
    try {
      response = await fetch('http://localhost:3001/api/negotiate-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile,
          calendarEvents: calendarEvents ?? [],
          transactions: transactions ?? [],
          neighbors: neighbors.map(n => ({
            id: n.id, name: n.name, avatar: n.emoji,
            food: n.food, description: n.description,
            portions: n.portions, priceRange: n.priceRange, color: n.color,
          })),
        }),
      })
    } catch (err) {
      console.error('Failed to connect to server:', err)
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        if (!line.trim()) continue
        let obj
        try { obj = JSON.parse(line) } catch { continue }

        const { neighborId } = obj

        if (obj.type === 'message') {
          const isSupersededMsg =
            obj.passFlag && obj.text?.includes('Another deal was already locked in')

          setPanels(prev => {
            const panel = prev[neighborId]
            const newTurn = obj.role === 'neighbor' ? panel.turn + 1 : panel.turn
            return {
              ...prev,
              [neighborId]: {
                ...panel,
                messages: [...panel.messages, obj],
                turn: newTurn,
                // mark superseded immediately so the banner shows before done arrives
                status: isSupersededMsg ? 'superseded' : panel.status,
              },
            }
          })
        }

        if (obj.type === 'done') {
          setPanels(prev => {
            const panel = prev[neighborId]
            const newStatus =
              obj.outcome === 'superseded' ? 'superseded'
              : panel.status === 'superseded' ? 'superseded'
              : obj.outcome === 'deal' ? 'deal'
              : obj.outcome === 'pass' ? 'pass'
              : 'negotiating'
            return { ...prev, [neighborId]: { ...panel, status: newStatus } }
          })

          doneCount.current += 1
          if (doneCount.current >= neighbors.length) {
            setAllDone(true)
          }
        }
      }
    }
  }

  const panelList = neighbors.map(n => ({ neighbor: n, ...panels[n.id] }))
  const deals  = panelList.filter(p => p.status === 'deal').length
  const passes = panelList.filter(p => p.status === 'pass' || p.status === 'superseded').length

  return (
    <div style={{
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: '1.5rem',
      maxWidth: 860,
      margin: '0 auto',
      width: '100%',
      boxSizing: 'border-box',
    }}>
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span style={{ fontWeight: 800, fontSize: 18, color: '#6366f1', letterSpacing: '-0.02em' }}>spoonly</span>
        <span style={{ fontSize: 13, color: 'var(--text, #6b6375)' }}>
          Running {neighbors.length} negotiations simultaneously
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 14,
      }}>
        {panelList.map(({ neighbor, messages, status, turn }) => (
          <NegotiationPanel
            key={neighbor.id}
            neighbor={neighbor}
            messages={messages}
            status={status}
            turn={turn}
          />
        ))}
      </div>

      {allDone && (
        <SummaryCard total={neighbors.length} deals={deals} passes={passes} />
      )}

      <p style={{ marginTop: '1rem', fontSize: 11, color: 'var(--text, #6b6375)', textAlign: 'center' }}>
        Powered by NVIDIA Nemotron Ultra 253B — parallel agent threads
      </p>
    </div>
  )
}
