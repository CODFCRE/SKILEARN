import { useState } from 'react'
import { Header, Icon, Screen } from '../../shared/components.jsx'

const listingCategories = [
  ['code', 'Tech'],
  ['palette', 'Arts'],
  ['menu_book', 'Academics'],
  ['translate', 'Languages'],
  ['fitness_center', 'Fitness'],
]
const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
export function SkillListing() {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Tech')
  const [rate, setRate] = useState('1.5')
  const [format, setFormat] = useState('online')
  const [activeDays, setActiveDays] = useState([0, 2, 3])
  const [published, setPublished] = useState(false)

  const toggleDay = (index) => {
    setActiveDays((currentDays) => (
      currentDays.includes(index)
        ? currentDays.filter((day) => day !== index)
        : [...currentDays, index]
    ))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setPublished(true)
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
              />
              <Icon filled>verified</Icon>
            </div>

            <div className="field-group">
              <div className="field-label">
                <span>Category</span>
                <small>Selected: {category}</small>
              </div>
              <div className="choice-row">
                {listingCategories.map(([icon, item]) => (
                  <button
                    type="button"
                    key={item}
                    className={category === item ? 'choice active' : 'choice'}
                    onClick={() => setCategory(item)}
                  >
                    <Icon>{icon}</Icon>
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="field-group">
              <div className="field-label">
                <span>Time-Credit Rate</span>
                <small>Fair campus benchmark</small>
              </div>
              <div className="rate-grid">
                {['1.0', '1.5', '2.0'].map((item, index) => (
                  <button
                    type="button"
                    key={item}
                    className={rate === item ? 'rate-choice active' : 'rate-choice'}
                    onClick={() => setRate(item)}
                  >
                    {index === 1 && (
                      <b>
                        <Icon filled>star</Icon>
                        Popular
                      </b>
                    )}
                    <strong>{item}</strong>
                    <small>Credits/hr</small>
                  </button>
                ))}
              </div>
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
            </div>

            <div className="listing-summary">
              <span>
                <Icon>schedule</Icon>
                Recommended session: 45-60 min
              </span>
              <b>Skill listing</b>
            </div>

            <button className="primary-action" type="submit">
              {published ? 'Listing saved' : 'Publish Skill Listing (+1 Bonus Credit)'}
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

