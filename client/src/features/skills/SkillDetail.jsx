import { useEffect, useState } from 'react'
import { EmptyState, Header, Icon, Screen } from '../../shared/components.jsx'
import { navigate } from '../../shared/lib/navigation.js'
import { supabase } from '../../shared/lib/supabase.js'

export function SkillDetail() {
  const skillId = window.history.state?.skillId
  const [skill, setSkill] = useState(null)
  const [mentor, setMentor] = useState(null)
  const [availability, setAvailability] = useState([])
  const [userId, setUserId] = useState(null)
  const [startsAt, setStartsAt] = useState('')
  const [loading, setLoading] = useState(Boolean(supabase))
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    const loadSkill = async () => {
      if (!supabase || !skillId) {
        setLoading(false)
        setError(!supabase ? 'Supabase is not configured.' : 'No skill was selected. Return to Exchange and choose a listing.')
        return
      }

      try {
        const [authResult, skillResult, availabilityResult] = await Promise.all([
          supabase.auth.getUser(),
          supabase.from('skills')
            .select('id,owner_id,title,description,category,credit_rate,session_format,status')
            .eq('id', skillId)
            .maybeSingle(),
          supabase.from('skill_availability')
            .select('weekday,start_time,end_time,timezone')
            .eq('skill_id', skillId)
            .order('weekday'),
        ])
        if (authResult.error) throw authResult.error
        if (skillResult.error) throw skillResult.error
        if (availabilityResult.error) throw availabilityResult.error
        if (!skillResult.data || skillResult.data.status !== 'published') {
          throw new Error('This skill listing is no longer available.')
        }

        const { data: mentorProfile, error: mentorError } = await supabase
          .from('profiles')
          .select('display_name,verification_status')
          .eq('id', skillResult.data.owner_id)
          .maybeSingle()
        if (mentorError) throw mentorError

        if (active) {
          setUserId(authResult.data.user?.id || null)
          setSkill(skillResult.data)
          setMentor(mentorProfile)
          setAvailability(availabilityResult.data || [])
        }
      } catch (requestError) {
        console.error('Unable to load skill details:', requestError)
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load skill details.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadSkill()
    return () => {
      active = false
    }
  }, [skillId])

  const handleBooking = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!supabase || !skill || !userId) {
      setError('Sign in before requesting a session.')
      return
    }
    if (userId === skill.owner_id) {
      setError('You cannot book your own skill listing.')
      return
    }

    const start = new Date(startsAt)
    if (!startsAt || Number.isNaN(start.getTime()) || start <= new Date()) {
      setError('Choose a future session date and time.')
      return
    }

    const end = new Date(start.getTime() + 60 * 60 * 1000)
    const format = skill.session_format === 'in_person' ? 'in_person' : 'online'
    setBooking(true)
    try {
      const { data, error: bookingError } = await supabase
        .from('sessions')
        .insert({
          skill_id: skill.id,
          mentor_id: skill.owner_id,
          learner_id: userId,
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
          session_format: format,
          credits_reserved: Number(skill.credit_rate),
          status: 'requested',
        })
        .select('id')
        .single()

      if (bookingError) throw bookingError
      setNotice('Session request sent.')
      navigate('/sessions', { sessionId: data.id })
    } catch (requestError) {
      console.error('Unable to request session:', requestError)
      setError(requestError instanceof Error ? requestError.message : 'Unable to request this session.')
    } finally {
      setBooking(false)
    }
  }

  return (
    <Screen active="exchange">
      <Header back />
      <main className="page detail-page">
        {loading ? (
          <div className="profile-loading" role="status">Loading skill details...</div>
        ) : error && !skill ? (
          <div className="profile-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => navigate('/')}>Back to Exchange</button>
          </div>
        ) : skill ? (
          <>
            <section className="detail-hero">
              <div className="detail-top">
                <span className="category">{skill.category}</span>
                <span className="price-pill">
                  <Icon filled>monetization_on</Icon>
                  {Number(skill.credit_rate).toFixed(2)} credits / hour
                </span>
              </div>
              <h1>{skill.title}</h1>
              <p>{skill.description || 'The mentor has not added a description for this skill yet.'}</p>
            </section>

            <section className="mentor-card">
              <div className="mentor-info">
                <div className="mentor-avatar"><Icon>person</Icon></div>
                <div>
                  <h2>{mentor?.display_name || 'Campus member'}</h2>
                  <p>{mentor?.verification_status === 'verified' ? 'Verified campus member' : 'Campus member'}</p>
                </div>
              </div>
            </section>

            <section className="skill-availability-card">
              <h2>Weekly availability</h2>
              {availability.length ? (
                <ul>
                  {availability.map((slot) => (
                    <li key={`${slot.weekday}-${slot.start_time}-${slot.end_time}`}>
                      <strong>{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][slot.weekday]}</strong>
                      <span>{slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)} {slot.timezone}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>The mentor has not added availability yet. You can still send a session request.</p>
              )}
            </section>

            {error && <div className="profile-error" role="alert">{error}</div>}
            {notice && <p className="listing-feedback success" role="status">{notice}</p>}
            {userId ? (
              <form className="booking-form" onSubmit={handleBooking}>
                <label htmlFor="session-start">Request a 1-hour session</label>
                <input
                  id="session-start"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                  required
                />
                <button className="primary-action" type="submit" disabled={booking}>
                  {booking ? 'Sending request...' : `Request session · ${Number(skill.credit_rate).toFixed(2)} credits`}
                  <Icon>arrow_forward</Icon>
                </button>
              </form>
            ) : (
              <button className="primary-action" type="button" onClick={() => navigate('/login')}>
                Sign in to request a session <Icon>arrow_forward</Icon>
              </button>
            )}
          </>
        ) : (
          <EmptyState icon="search_off" title="Skill unavailable" text={error || 'Return to Exchange and select a skill.'} />
        )}
      </main>
    </Screen>
  )
}
