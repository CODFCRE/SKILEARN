import { EmptyState, Header, Icon, Screen } from '../../shared/components.jsx'
export function SkillDetail() {
  return (
    <Screen active="exchange">
      <Header back />
      <main className="page detail-page">
        <section className="detail-hero">
          <div className="detail-top">
            <span className="category">Skill details</span>
            <span className="price-pill">
              <Icon filled>monetization_on</Icon>
              Credit rate unavailable
            </span>
          </div>
          <h1>Skill details unavailable</h1>
          <p>
            This skill has not been loaded yet. Connect the app to your skill service to
            view its description, mentor details, and available time slots.
          </p>
        </section>

        <section className="mentor-card">
          <div className="mentor-info">
            <div className="mentor-avatar">
              <Icon>person</Icon>
            </div>
            <div>
              <h2>Mentor details unavailable</h2>
              <p>Profile information will appear when the skill is loaded.</p>
            </div>
          </div>
          <button className="button button-outline" disabled>
            <Icon>chat</Icon>
            Message Mentor
          </button>
        </section>

        <EmptyState
          icon="event_busy"
          title="No time slots available"
          text="Available booking times will appear here when this skill is connected."
        />
      </main>
    </Screen>
  )
}

