import { useEffect, useState } from 'react'
import { EmptyState, Header, Icon, Screen } from '../../shared/components.jsx'
import { navigate } from '../../shared/lib/navigation.js'
import { supabase } from '../../shared/lib/supabase.js'

export function Exchange() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(Boolean(supabase))
  const [signedIn, setSignedIn] = useState(false)
  const [loadError, setLoadError] = useState(() => (
    supabase ? '' : 'Supabase is not configured. Set the client VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  ))

  useEffect(() => {
    let active = true

    const loadSkills = async (session) => {
      if (!active) return
      setLoading(true)
      setLoadError('')
      setSignedIn(Boolean(session))

      if (!session) {
        setSkills([])
        setLoading(false)
        return
      }

      try {
        const { data: skillRows, error: skillsError } = await supabase
          .from('skills')
          .select('id,owner_id,title,description,category,credit_rate,session_format,created_at')
          .eq('status', 'published')
          .order('created_at', { ascending: false })

        if (skillsError) throw skillsError

        const ownerIds = [...new Set((skillRows || []).map((skill) => skill.owner_id))]
        let profilesById = {}
        if (ownerIds.length) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id,display_name')
            .in('id', ownerIds)

          if (profilesError) throw profilesError
          profilesById = Object.fromEntries((profiles || []).map((profile) => [profile.id, profile]))
        }

        if (active) {
          setSkills((skillRows || []).map((skill) => ({
            ...skill,
            person: profilesById[skill.owner_id]?.display_name || 'Campus member',
          })))
        }
      } catch (error) {
        console.error('Unable to load published skills:', error)
        if (active) {
          setLoadError(error instanceof Error ? error.message : 'Unable to load skill listings.')
          setSkills([])
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    if (!supabase) {
      return () => {
        active = false
      }
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) throw error
      return loadSkills(data.session)
    }).catch((error) => {
      console.error('Unable to check authentication before loading skills:', error)
      if (active) {
        setLoadError(error instanceof Error ? error.message : 'Unable to check your sign-in status.')
        setLoading(false)
      }
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      loadSkills(session)
    })

    return () => {
      active = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  const normalizedQuery = query.trim().toLowerCase()
  const exchangeCategories = ['All', ...new Set(skills.map((skill) => skill.category).filter(Boolean))]
  const filteredSkills = skills.filter((skill) => {
    const matchesCategory = category === 'All' || skill.category === category
    const matchesQuery = `${skill.title} ${skill.description || ''} ${skill.person}`.toLowerCase()
      .includes(normalizedQuery)
    return matchesCategory && matchesQuery
  })

  return (
    <Screen active="exchange">
      <Header
        rightAction={!loading && !signedIn && (
          <button className="profile-login-button" type="button" onClick={() => navigate('/login')}>
            Login
          </button>
        )}
      />
      <main className="page exchange-page">
        <div className="search-wrap">
          <Icon>search</Icon>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search available skills..."
            aria-label="Search available skills"
          />
        </div>
        <div className="filter-row" role="group" aria-label="Skill categories">
          {exchangeCategories.map((item) => (
            <button
              key={item}
              className={category === item ? 'filter active' : 'filter'}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
        {loadError && (
          <div className="profile-error" role="alert">
            <span>{loadError}</span>
          </div>
        )}
        {loading ? (
          <div className="profile-loading" role="status">Loading published skills...</div>
        ) : !signedIn && !loadError ? (
          <EmptyState
            icon="lock"
            title="Sign in to browse skills"
            text="Log in with your email code to see published campus skill listings."
          />
        ) : filteredSkills.length ? (
          <div className="skills-grid">
            {filteredSkills.map((skill) => (
              <article
                className="profile-skill-card exchange-skill-card"
                key={skill.id}
                onClick={() => navigate('/skill-detail', { skillId: skill.id })}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    navigate('/skill-detail', { skillId: skill.id })
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`View ${skill.title}`}
              >
                <span className="profile-skill-icon">
                  <Icon>school</Icon>
                </span>
                <div className="profile-skill-copy">
                  <h3>{skill.title}</h3>
                  <p>{skill.description || skill.category}</p>
                  <span>{skill.category} · {skill.person}</span>
                </div>
                <strong>{Number(skill.credit_rate).toFixed(2)} Cr/hr</strong>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="search_off"
            title={skills.length ? 'No matching skills' : 'No skills available yet'}
            text={skills.length
              ? 'Try another search or category.'
              : 'Published skill listings will appear here when they are available.'}
          />
        )}
      </main>
    </Screen>
  )
}
