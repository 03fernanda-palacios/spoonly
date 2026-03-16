import { useState, useEffect } from 'react'

function App() {
  const [calendarEvents, setCalendarEvents] = useState(null)

  useEffect(() => {
    function handleMessage(event) {
      if (event.data?.type === 'GOOGLE_CALENDAR_EVENTS') {
        setCalendarEvents(event.data.events)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  function connectCalendar() {
    const width = 500
    const height = 650
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2
    window.open(
      'http://localhost:3001/auth/google',
      'Google Calendar Auth',
      `width=${width},height=${height},left=${left},top=${top}`
    )
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', padding: '2rem', maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Spoonly</h1>

      {calendarEvents === null ? (
        <button
          onClick={connectCalendar}
          style={{
            background: '#6366f1',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          Connect Google Calendar
        </button>
      ) : (
        <div>
          <p style={{ color: '#6366f1', fontWeight: 600, marginBottom: '1rem' }}>
            Calendar connected — {calendarEvents.length} event(s) tomorrow
          </p>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {calendarEvents.length === 0 && (
              <li style={{ color: '#888' }}>No events tomorrow — free day!</li>
            )}
            {calendarEvents.map((e, i) => (
              <li key={i} style={{ marginBottom: '0.5rem', background: '#f3f4f6', borderRadius: 6, padding: '0.5rem 0.75rem' }}>
                <strong>{e.summary}</strong>{' '}
                <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  {e.start?.dateTime
                    ? `${new Date(e.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${new Date(e.end.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'All day'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default App
