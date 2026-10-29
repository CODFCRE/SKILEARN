import { useEffect, useState } from 'react'
import { EmptyState, Header, Icon, Screen } from '../../shared/components.jsx'
import { navigate } from '../../shared/lib/navigation.js'
import { supabase } from '../../shared/lib/supabase.js'
import { SpotlightCard } from '../../shared/SpotlightCard.jsx'

export function Exchange({ onlineMemberIds, presenceReady, presenceError }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [discoveryMode, setDiscoveryMode] = useState('skills')
  const [skills, setSkills] = useState([])
  const [people, setPeople] = useState([])
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
        setPeople([])
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
        const [ownersResult, peopleResult] = await Promise.all([
          ownerIds.length
            ? supabase.from('profiles').select('id,display_name').in('id', ownerIds)
            : Promise.resolve({ data: [], error: null }),
          supabase.from('profiles').select('id,display_name').order('display_name').limit(200),
        ])
        if (ownersResult.error) throw ownersResult.error
        if (peopleResult.error) throw peopleResult.error
        const profilesById = Object.fromEntries((ownersResult.data || []).map((profile) => [profile.id, profile]))

        if (active) {
          setSkills((skillRows || []).map((skill) => ({
            ...skill,
            person: profilesById[skill.owner_id]?.display_name || 'Campus member',
          })))
          setPeople((peopleResult.data || []).map((person) => ({
            ...person,
            displayName: person.display_name || 'Campus member',
          })).filter((person) => person.id !== session.user.id))
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
  const filteredPeople = people.filter((person) => (
    person.displayName.toLowerCase().includes(normalizedQuery)
  ))

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
        <div className="exchange-discovery">
          <div className="search-wrap">
            <Icon>search</Icon>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={discoveryMode === 'skills' ? 'Search skills or people...' : 'Search people...'}
              aria-label={discoveryMode === 'skills' ? 'Search skills or people' : 'Search people'}
            />
          </div>
          <div className="discovery-switch" role="tablist" aria-label="Search category">
            <button
              type="button"
              role="tab"
              aria-selected={discoveryMode === 'skills'}
              className={discoveryMode === 'skills' ? 'active' : ''}
              onClick={() => {
                setDiscoveryMode('skills')
                setCategory('All')
              }}
            >
              <Icon>school</Icon> Skills
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={discoveryMode === 'people'}
              className={discoveryMode === 'people' ? 'active' : ''}
              onClick={() => {
                setDiscoveryMode('people')
                setCategory('All')
              }}
            >
              <Icon>group</Icon> People
            </button>
          </div>
        </div>
        {discoveryMode === 'skills' && (
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
        )}
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
        ) : discoveryMode === 'skills' && filteredSkills.length ? (
          <div className="skills-grid">
            {filteredSkills.map((skill) => (
              <SpotlightCard
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
                <span
                  className={`presence-dot ${onlineMemberIds.includes(skill.owner_id) ? 'online' : presenceReady && !presenceError ? 'offline' : 'unknown'}`}
                  aria-label={presenceError || !presenceReady ? 'Availability unknown' : onlineMemberIds.includes(skill.owner_id) ? 'Online' : 'Offline'}
                  title={presenceError || !presenceReady ? 'Availability unknown' : onlineMemberIds.includes(skill.owner_id) ? 'Online' : 'Offline'}
                />
                <div className="profile-skill-copy">
                  <h3>{skill.title}</h3>
                  <p>{skill.description || skill.category}</p>
                  <span>{skill.category} · {skill.person}</span>
                </div>
                <strong>{Number(skill.credit_rate).toFixed(2)} Cr/hr</strong>
              </SpotlightCard>
            ))}
          </div>
        ) : discoveryMode === 'people' && filteredPeople.length ? (
          <div className="people-grid">
            {filteredPeople.map((person) => {
              const isOnline = onlineMemberIds.includes(person.id)
              const availability = presenceError || !presenceReady
                ? 'Availability unavailable'
                : isOnline
                  ? 'Online now'
                  : 'Offline'

              return (
                <article
                  className="people-card"
                  key={person.id}
                  role="link"
                  tabIndex={0}
                  aria-label={`View ${person.displayName}'s profile`}
                  onClick={() => navigate('/member-profile', { memberId: person.id })}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      navigate('/member-profile', { memberId: person.id })
                    }
                  }}
                >
                  <span className="people-avatar" aria-hidden="true">
                    {person.displayName.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="people-card-copy">
                    <strong>{person.displayName}</strong>
                    <span className="presence-label">
                      <i className={`presence-dot ${isOnline ? 'online' : presenceReady && !presenceError ? 'offline' : 'unknown'}`} />
                      {availability}
                    </span>
                  </div>
                  <span className="people-view-profile">View profile</span>
                </article>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={discoveryMode === 'skills' ? 'search_off' : 'person_search'}
            title={discoveryMode === 'skills'
              ? skills.length ? 'No matching skills' : 'No skills available yet'
              : people.length ? 'No matching people' : 'No people found'}
            text={discoveryMode === 'skills'
              ? skills.length
                ? 'Try another search or category.'
                : 'Published skill listings will appear here when they are available.'
              : 'Try a different name.'}
          />
        )}
      </main>
    </Screen>
  )
}
