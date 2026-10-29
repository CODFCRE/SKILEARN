import { useEffect, useState } from 'react'
import { EmptyState, Header, Icon, Screen } from '../../shared/components.jsx'
import { navigate } from '../../shared/lib/navigation.js'
import { supabase } from '../../shared/lib/supabase.js'

const quickActions = [
  ['add_circle', 'Offer New Skill', '/skill-listing'],
  ['search', 'Find Skills', '/'],
  ['schedule', 'My Sessions', '/sessions'],
]

export function Wallet() {
  const [wallet, setWallet] = useState(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const loadWallet = async () => {
      if (!supabase) return
      setLoading(true)
      setError('')
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!authData.user) {
          if (active) setWallet(null)
          return
        }

        const userId = authData.user.id
        const monthStart = new Date()
        monthStart.setDate(1)
        monthStart.setHours(0, 0, 0, 0)
        const [balanceResult, ledgerResult, skillsResult, ratingsResult, completedResult] = await Promise.all([
          supabase.from('credit_balances').select('balance').eq('user_id', userId).maybeSingle(),
          supabase.from('credit_ledger').select('id,amount,entry_type,description,created_at')
            .eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
          supabase.from('skills').select('id,status').eq('owner_id', userId),
          supabase.from('session_ratings').select('rating').eq('reviewee_id', userId),
          supabase.from('sessions').select('id').or(`mentor_id.eq.${userId},learner_id.eq.${userId}`)
            .eq('status', 'completed').gte('ends_at', monthStart.toISOString()),
        ])

        const results = [balanceResult, ledgerResult, skillsResult, ratingsResult, completedResult]
        const queryError = results.find((result) => result.error)?.error
        if (queryError) throw queryError

        if (active) {
          const ratings = ratingsResult.data || []
          setWallet({
            balance: Number(balanceResult.data?.balance || 0),
            ledger: ledgerResult.data || [],
            publishedSkills: (skillsResult.data || []).filter((skill) => skill.status === 'published').length,
            skillCount: (skillsResult.data || []).length,
            rating: ratings.length
              ? (ratings.reduce((sum, item) => sum + Number(item.rating), 0) / ratings.length).toFixed(1)
              : '—',
            completedThisMonth: completedResult.data?.length || 0,
          })
        }
      } catch (requestError) {
        console.error('Unable to load wallet data:', requestError)
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load wallet data.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadWallet()
    return () => {
      active = false
    }
  }, [])

  return (
    <Screen active="wallet">
      <Header />
      <main className="page wallet-page">
        {error && <div className="profile-error" role="alert">{error}</div>}
        {loading ? (
          <div className="profile-loading" role="status">Loading your wallet...</div>
        ) : (
          <>
            <section className="balance-card">
              <div>
                <span className="eyebrow">Time-Credit Balance</span>
                <h1>{wallet ? `${wallet.balance.toFixed(2)} Credits` : 'Sign in to view balance'}</h1>
              </div>
              <div className="coin">
                <Icon filled>monetization_on</Icon>
              </div>
              <div className="balance-footer">
                <span>{wallet ? 'Balance from your credit ledger' : 'Your account balance is private.'}</span>
                {!wallet && (
                  <button className="button button-lime" onClick={() => navigate('/login')}>Login</button>
                )}
              </div>
            </section>

            <h2 className="section-title">Quick Actions</h2>
            <div className="quick-actions">
              {quickActions.map(([icon, label, path]) => (
                <button key={label} onClick={() => navigate(path)}>
                  <span><Icon>{icon}</Icon></span>
                  <b>{label}</b>
                </button>
              ))}
            </div>

            {wallet && (
              <div className="stat-grid">
                <Stat title="Completed This Month" text="Completed sessions this month" value={wallet.completedThisMonth} />
                <Stat title="Skill Standing" text="Average rating from peers" value={wallet.rating} />
                <Stat title="Active Listings" text={`${wallet.skillCount} total listings`} value={wallet.publishedSkills} />
              </div>
            )}

            <h2 className="section-title">Recent Transactions</h2>
            {!wallet ? (
              <EmptyState icon="lock" title="Sign in to view transactions" text="Your credit activity is private to your account." />
            ) : wallet.ledger.length ? (
              <div className="ledger-list">
                {wallet.ledger.map((entry) => (
                  <article className="wallet-ledger-card" key={entry.id}>
                    <span className={`wallet-ledger-icon${Number(entry.amount) < 0 ? ' debit' : ''}`}>
                      <Icon>{Number(entry.amount) < 0 ? 'south_west' : 'north_east'}</Icon>
                    </span>
                    <div>
                      <strong>{entry.description}</strong>
                      <small>{entry.entry_type.replaceAll('_', ' ')} · {new Date(entry.created_at).toLocaleString()}</small>
                    </div>
                    <b>{Number(entry.amount) > 0 ? '+' : ''}{Number(entry.amount).toFixed(2)} Cr</b>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState icon="receipt_long" title="No transactions yet" text="Your credit activity will appear here." />
            )}
          </>
        )}
      </main>
    </Screen>
  )
}

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
