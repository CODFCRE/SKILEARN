import { useEffect, useState } from 'react'
import './App.css'

const skills = []

function Icon({ children, filled = false }) {
	return <span className={`material-symbols-outlined ${filled ? 'filled' : ''}`}>{children}</span>
}

function Header({ back = false }) {
	return <header className="topbar"><div className="topbar-inner"><div className="brand-group">{back && <button className="icon-button" onClick={() => window.history.back()} aria-label="Go back"><Icon>arrow_back</Icon></button>}<div className="brand-mark"><Icon>person</Icon></div><span className="brand">Skilearn</span></div><div className="header-actions"><button className="icon-button notification" aria-label="Notifications"><Icon>notifications</Icon></button>{back && <div className="small-avatar"><Icon>person</Icon></div>}</div></div></header>
}

function BottomNav({ active }) {
	const links = [['exchange', 'swap_horiz', 'Exchange'], ['sessions', 'event', 'Sessions'], ['wallet', 'monetization_on', 'Credits'], ['profile', 'person', 'Profile']]
	const go = (path) => { window.history.pushState({}, '', path === 'exchange' ? '/' : `/${path}`); window.dispatchEvent(new PopStateEvent('popstate')) }
	return <nav className="bottom-nav">{links.map(([key, icon, label]) => <button key={key} className={active === key ? 'nav-item active' : 'nav-item'} onClick={() => go(key)}><Icon filled={active === key}>{icon}</Icon><span>{label}</span></button>)}</nav>
}

function EmptyState({ icon, title, text }) {
	return <div className="empty-state"><Icon>{icon}</Icon><h2>{title}</h2><p>{text}</p></div>
}

function Exchange() {
	const [query, setQuery] = useState('')
	const [category, setCategory] = useState('All')
	const filtered = skills.filter((skill) => (category === 'All' || skill.category === category) && `${skill.title} ${skill.person}`.toLowerCase().includes(query.toLowerCase()))
	return <div className="app-shell"><Header /><main className="page exchange-page"><div className="search-wrap"><Icon>search</Icon><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search available skills..." /></div><div className="filter-row">{['All', 'Tech', 'Arts', 'Academics', 'Languages'].map((item) => <button key={item} className={category === item ? 'filter active' : 'filter'} onClick={() => setCategory(item)}>{item}</button>)}</div>{filtered.length ? <div className="skills-grid" /> : <EmptyState icon="search_off" title="No skills available yet" text="Published skill listings will appear here when they are available." />}</main><BottomNav active="exchange" /></div>
}

function Sessions() {
	const [tab, setTab] = useState('upcoming')
	const states = { upcoming: ['event_busy', 'No upcoming sessions', 'Your scheduled sessions will appear here.'], completed: ['history', 'No completed sessions', 'Your completed sessions will appear here.'], messages: ['forum', 'No messages', 'Messages with other users will appear here.'] }
	const [icon, title, text] = states[tab]
	return <div className="app-shell"><Header /><main className="page sessions-page"><div className="page-intro"><h1>My Sessions & Messages</h1><p>Manage your scheduled mentoring, feedback history, and peer chats.</p></div><div className="tabs">{Object.keys(states).map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div><EmptyState icon={icon} title={title} text={text} /></main><BottomNav active="sessions" /></div>
}

function Wallet() {
	return <div className="app-shell"><Header /><main className="page wallet-page"><section className="balance-card"><div><span className="eyebrow">Time-Credit Balance</span><h1>Balance: -- Credits</h1></div><div className="coin"><Icon filled>monetization_on</Icon></div><div className="balance-footer"><span>● Connect an account to view your balance</span><button className="button button-lime">Redeem Hours</button></div></section><h2 className="section-title">Quick Actions</h2><div className="quick-actions">{[['add_circle', 'Offer New Skill'], ['search', 'Find Sessions'], ['schedule', 'Schedule'], ['qr_code_scanner', 'Scan & Pay']].map(([icon, label]) => <button key={label}><span><Icon>{icon}</Icon></span><b>{label}</b></button>)}</div><div className="stat-grid"><Stat title="Daily Goal" text="Your progress will appear after your account is connected." value="--" /><Stat title="Skill Standing" text="Your reviews and standing will appear here." value="--" /><Stat title="Active Listing" text="Your published skills will appear here." value="--" /></div><h2 className="section-title">Recent Transactions</h2><EmptyState icon="receipt_long" title="No transactions yet" text="Your credit activity will appear here." /></main><BottomNav active="wallet" /></div>
}

function Stat({ title, text, value }) {
	return <article className="stat-card"><div><h3>{title}</h3><p>{text}</p></div><span>{value}</span></article>
}

function SkillDetail() {
	return <div className="app-shell"><Header back /><main className="page detail-page"><section className="detail-hero"><div className="detail-top"><span className="category">Skill details</span><span className="price-pill"><Icon filled>monetization_on</Icon>Credit rate unavailable</span></div><h1>Skill details unavailable</h1><p>This skill has not been loaded yet. Connect the app to your skill service to view its description, mentor details, and available time slots.</p></section><section className="mentor-card"><div className="mentor-info"><div className="mentor-avatar"><Icon>person</Icon></div><div><h2>Mentor details unavailable</h2><p>Profile information will appear when the skill is loaded.</p></div></div><button className="button button-outline" disabled><Icon>chat</Icon>Message Mentor</button></section><EmptyState icon="event_busy" title="No time slots available" text="Available booking times will appear here when this skill is connected." /></main><BottomNav active="exchange" /></div>
}

function App() {
	const [path, setPath] = useState(window.location.pathname)
	useEffect(() => { const update = () => setPath(window.location.pathname); window.addEventListener('popstate', update); return () => window.removeEventListener('popstate', update) }, [])
	if (path === '/sessions') return <Sessions />
	if (path === '/wallet') return <Wallet />
	if (path === '/skill-detail') return <SkillDetail />
	return <Exchange />
}

export default App
