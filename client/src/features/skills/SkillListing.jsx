import { useEffect, useState } from 'react'
import { Header, Icon, Screen } from '../../shared/components.jsx'
import { supabase } from '../../shared/lib/supabase.js'
import { navigate } from '../../shared/lib/navigation.js'

const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
export function SkillListing() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [categories, setCategories] = useState([])
  const [rate, setRate] = useState('')
  const [format, setFormat] = useState('online')
  const [activeDays, setActiveDays] = useState([])
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [published, setPublished] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedSkillId, setSavedSkillId] = useState(null)

  useEffect(() => {
    let active = true
    const loadCategories = async () => {
      if (!supabase) return
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!authData.user) return
        const { data, error: categoryError } = await supabase
          .from('skills')
          .select('category')
          .order('category')
        if (categoryError) throw categoryError
        if (active) setCategories([...new Set((data || []).map((skill) => skill.category).filter(Boolean))])
      } catch (requestError) {
        console.error('Unable to load skill categories:', requestError)
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load skill categories.')
      }
    }

    loadCategories()
    return () => {
      active = false
    }
  }, [])

  const toggleDay = (index) => {
    setActiveDays((currentDays) => (
      currentDays.includes(index)
        ? currentDays.filter((day) => day !== index)
        : [...currentDays, index]
    ))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!supabase) {
      setError('Supabase is not configured. Set the client VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
      return
    }

    if (activeDays.length && (!startTime || !endTime || startTime >= endTime)) {
      setError('Choose an availability start and end time; the end must be later than the start.')
      return
    }

    setSaving(true)
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!sessionData.session) {
        setError('Sign in before publishing a skill listing.')
        return
      }

      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!userData.user) {
        setError('Sign in before publishing a skill listing.')
        return
      }

      let skillId = savedSkillId
      if (!skillId) {
        const { data: skill, error: skillError } = await supabase
          .from('skills')
          .insert({
            owner_id: userData.user.id,
            title: title.trim(),
            description: description.trim() || null,
            category,
            credit_rate: Number(rate),
            session_format: format === 'in-person' ? 'in_person' : 'online',
            status: 'published',
          })
          .select('id')
          .single()

        if (skillError) throw skillError
        skillId = skill.id
        setSavedSkillId(skillId)
      }

      if (activeDays.length) {
        const postgresWeekdays = [1, 2, 3, 4, 5, 6, 0]
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
        const availability = activeDays.map((day) => ({
          skill_id: skillId,
          weekday: postgresWeekdays[day],
          start_time: startTime,
          end_time: endTime,
          timezone,
        }))
        const { error: availabilityError } = await supabase
          .from('skill_availability')
          .insert(availability)

        if (availabilityError) {
          throw new Error(`The skill was saved, but its availability could not be saved: ${availabilityError.message}`)
        }
      }

      setPublished(true)
    } catch (requestError) {
      console.error('Unable to publish skill listing:', requestError)
      setError(requestError instanceof Error ? requestError.message : 'Unable to save the skill listing.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen active="exchange" className="design-shell">
      <Header back />
      <main className="design-page listing-page">
        <section className="design-heading">
          <div>
            <div className="step-line">
              <span>Step 1 of 3</span>
              <small>Community Exchange</small>
            </div>
            <h1>Offer a New Skill</h1>
          </div>
          <div className="heading-icon">
            <Icon>school</Icon>
          </div>
        </section>

        <section className="listing-card">
          <div className="listing-card-top">
            <span className="credit-badge">
              <Icon filled>monetization_on</Icon>
              Earn Time Credits
            </span>
            <span className="verified-state">
              <i />
              Peer Verified
            </span>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="skill-title">
              <span>Skill Title</span>
              <small>Max 60 chars</small>
            </label>
            <div className="input-with-icon">
              <input
                id="skill-title"
                value={title}
                maxLength="60"
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Python Backend & Data Structures"
                minLength="2"
                required
              />
              <Icon filled>verified</Icon>
            </div>

            <label className="field-label" htmlFor="skill-description">
              <span>Description</span>
              <small>Tell peers what you can teach</small>
            </label>
            <textarea
              id="skill-description"
              className="listing-description"
              value={description}
              maxLength={2000}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe your experience and what learners can expect."
            />

            <div className="field-group">
              <div className="field-label">
                <span>Category</span>
                <small>Choose an existing category or enter a new one</small>
              </div>
              <input
                className="listing-select-input"
                list="skill-categories"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="e.g. Tech, Arts, Languages"
                required
              />
              <datalist id="skill-categories">
                {categories.map((item) => <option key={item} value={item} />)}
              </datalist>
            </div>

            <div className="field-group">
              <div className="field-label">
                <span>Time-Credit Rate</span>
                <small>Credits per hour</small>
              </div>
              <input
                className="listing-select-input"
                type="number"
                min="0.01"
                step="0.01"
                value={rate}
                onChange={(event) => setRate(event.target.value)}
                placeholder="Enter credits per hour"
                required
              />
            </div>

            <div className="field-group">
              <div className="field-label">
                <span>Session Format</span>
              </div>
              <div className="format-grid">
                {[
                  ['online', 'videocam', 'Online Session', 'via CampusMeet'],
                  ['in-person', 'local_library', 'In-Person Space', 'Library Study Pod'],
                ].map(([value, icon, label, detail]) => (
                  <button
                    type="button"
                    key={value}
                    className={format === value ? 'format-choice active' : 'format-choice'}
                    onClick={() => setFormat(value)}
                  >
                    <span>
                      <Icon>{icon}</Icon>
                    </span>
                    <div>
                      <strong>{label}</strong>
                      <small>{detail}</small>
                    </div>
                    {format === value && <Icon filled>check_circle</Icon>}
                  </button>
                ))}
              </div>
            </div>

            <div className="field-group">
              <div className="field-label">
                <span>Weekly Availability</span>
                <small>{activeDays.length} Days Active</small>
              </div>
              <div className="day-row">
                {weekDays.map((day, index) => (
                  <button
                    type="button"
                    key={`${day}-${index}`}
                    className={activeDays.includes(index) ? 'day active' : 'day'}
                    onClick={() => toggleDay(index)}
                  >
                    <span>{day}</span>
                    {activeDays.includes(index) && <i />}
                  </button>
                ))}
              </div>
              <div className="availability-time-row">
                <label>
                  <span>From</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    disabled={!activeDays.length}
                    required={activeDays.length > 0}
                  />
                </label>
                <label>
                  <span>Until</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    disabled={!activeDays.length}
                    required={activeDays.length > 0}
                  />
                </label>
                <small>Times use your local timezone.</small>
              </div>
            </div>

            <div className="listing-summary">
              <span>
                <Icon>schedule</Icon>
                Recommended session: 45-60 min
              </span>
              <b>Skill listing</b>
            </div>

            {error && (
              <div className="listing-feedback error" role="alert">
                <span>{error}</span>
                {error === 'Sign in before publishing a skill listing.' && (
                  <button type="button" onClick={() => navigate('/login')}>Log in</button>
                )}
              </div>
            )}
            {published && (
              <p className="listing-feedback success" role="status">
                {activeDays.length
                  ? 'Your skill and weekly availability have been saved.'
                  : 'Your skill has been saved.'}
              </p>
            )}
            <button className="primary-action" type="submit" disabled={saving || published}>
              {saving ? 'Saving listing...' : published ? 'Listing saved' : 'Publish Skill Listing'}
              <Icon>arrow_forward</Icon>
            </button>
          </form>
        </section>

        <section className="guarantee">
          <Icon>workspace_premium</Icon>
          <div>
            <h3>Campus Escrow Guarantee</h3>
            <p>Time credits are deposited right after mutual completion confirmation.</p>
          </div>
        </section>
      </main>
    </Screen>
  )
}
