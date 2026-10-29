import { EmptyState, Header, Icon, Screen } from '../../shared/components.jsx'
import { navigate } from '../../shared/lib/navigation.js'

const quickActions = [
  ['add_circle', 'Offer New Skill', '/skill-listing'],
  ['search', 'Find Sessions', '/'],
  ['schedule', 'Schedule', '/sessions'],
  ['qr_code_scanner', 'Scan & Pay', '/verification'],
]

function Stat({ title, text, value }) {
  return (
    <article className="stat-card">
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      <span>{value}</span>
    </article>
  )
}
export function Wallet() {
  return (
    <Screen active="wallet">
      <Header />
      <main className="page wallet-page">
        <section className="balance-card">
          <div>
            <span className="eyebrow">Time-Credit Balance</span>
            <h1>Balance: -- Credits</h1>
          </div>
          <div className="coin">
            <Icon filled>monetization_on</Icon>
          </div>
          <div className="balance-footer">
            <span>â— Connect an account to view your balance</span>
            <button className="button button-lime">Redeem Hours</button>
          </div>
        </section>

        <h2 className="section-title">Quick Actions</h2>
        <div className="quick-actions">
          {quickActions.map(([icon, label, path]) => (
            <button key={label} onClick={() => navigate(path)}>
              <span>
                <Icon>{icon}</Icon>
              </span>
              <b>{label}</b>
            </button>
          ))}
        </div>

        <div className="stat-grid">
          <Stat
            title="Daily Goal"
            text="Your progress will appear after your account is connected."
            value="--"
          />
          <Stat
            title="Skill Standing"
            text="Your reviews and standing will appear here."
            value="--"
          />
          <Stat
            title="Active Listing"
            text="Your published skills will appear here."
            value="--"
          />
        </div>

        <h2 className="section-title">Recent Transactions</h2>
        <EmptyState
          icon="receipt_long"
          title="No transactions yet"
          text="Your credit activity will appear here."
        />
      </main>
    </Screen>
  )
}

