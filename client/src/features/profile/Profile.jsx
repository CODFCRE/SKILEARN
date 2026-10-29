import { useEffect, useState } from 'react'
import { supabase, supabaseConfigured } from '../../shared/lib/supabase.js'
import { EmptyState, Header, Icon, Screen } from '../../shared/components.jsx'
import { navigate } from '../../shared/lib/navigation.js'
export function Profile() {
  const [profileData, setProfileData] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [loading, setLoading] = useState(supabaseConfigured)
  const [signingOut, setSigningOut] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true

    if (!supabaseConfigured || !supabase) {
      return undefined
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' && !session) {
        setProfileData(null)
        setLoadError('')
        setLoading(false)
      }
    })

    const loadProfile = async () => {
      setLoading(true)
      setLoadError('')

      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        if (!sessionData.session) {
          return
        }

        const { data: authData, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!authData.user) {
          return
        }

        const user = authData.user
        const [
          profileResult,
          skillsResult,
          sessionsResult,
          ratingsResult,
          balanceResult,
        ] = await Promise.all([
          supabase
            .from('profiles')
            .select('display_name,campus_email,avatar_path,verification_status')
            .eq('id', user.id)
            .maybeSingle(),
          supabase
            .from('skills')
            .select('id,title,description,category,credit_rate,status,created_at')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('sessions')
            .select('id,status')
            .or(`mentor_id.eq.${user.id},learner_id.eq.${user.id}`),
          supabase
            .from('session_ratings')
            .select('rating')
            .eq('reviewee_id', user.id),
          supabase
            .from('credit_balances')
            .select('balance')
            .eq('user_id', user.id)
            .maybeSingle(),
        ])

        const queryErrors = [
          profileResult.error,
          skillsResult.error,
          sessionsResult.error,
          ratingsResult.error,
          balanceResult.error,
        ].filter(Boolean)

        let avatarUrl = ''
        if (profileResult.data?.avatar_path) {
          const { data: avatarData, error: avatarError } = await supabase.storage
            .from('files')
            .createSignedUrl(profileResult.data.avatar_path, 3600)
          if (avatarError) queryErrors.push(avatarError)
          else avatarUrl = avatarData.signedUrl
        }

        if (queryErrors.length) {
          console.error('Unable to load some profile data:', queryErrors)
        }

        if (active) {
          setProfileData({
            user,
            profile: profileResult.data,
            skills: skillsResult.data || [],
            sessions: sessionsResult.data || [],
            ratings: ratingsResult.data || [],
            balance: balanceResult.data?.balance ?? null,
            avatarUrl,
          })
          setLoadError(
            queryErrors.length
              ? `Some profile information could not be loaded: ${queryErrors.map((error) => error.message).join(' ')}`
              : '',
          )
        }
      } catch (requestError) {
        console.error('Unable to load profile:', requestError)
        if (active) {
          setLoadError(
            requestError instanceof Error
              ? requestError.message
              : 'Unable to load your profile. Please try again.',
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadProfile()

    return () => {
      active = false
      authListener.subscription.unsubscribe()
    }
  }, [reloadKey])

  const handleSignOut = async () => {
    if (!supabase) return

    setSigningOut(true)
    setActionError('')
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setProfileData(null)
      setLoadError('')
    } catch (error) {
      console.error('Unable to sign out:', error)
      setActionError(error instanceof Error ? error.message : 'Unable to sign out. Please try again.')
    } finally {
      setSigningOut(false)
    }
  }

  const user = profileData?.user
  const metadata = user?.user_metadata || {}
  const displayName = profileData?.profile?.display_name
    || metadata.full_name
    || metadata.name
    || user?.email?.split('@')[0]
    || 'Your profile'
  const email = profileData?.profile?.campus_email || user?.email || 'Email unavailable'
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : 'Date unavailable'
  const ratings = profileData?.ratings || []
  const averageRating = ratings.length
    ? (ratings.reduce((sum, item) => sum + Number(item.rating), 0) / ratings.length).toFixed(1)
    : 'â€”'
  const verificationStatus = profileData?.profile?.verification_status || 'pending'
  const formattedStatus = verificationStatus.replaceAll('_', ' ')
  const isVerified = verificationStatus === 'verified'
  const formattedBalance = profileData === null || profileData.balance === null
    ? 'â€”'
    : `${Number(profileData.balance).toFixed(2)} Cr`

  return (
    <Screen active="profile" className="design-shell profile-shell">
      <Header
        rightAction={!user && (
          <button className="profile-login-button" type="button" onClick={() => navigate('/login')}>
            Login
          </button>
        )}
      />
      <main className="profile-page">
        {loadError && (
          <div className="profile-error" role="alert">
            <span>{loadError}</span>
            <button type="button" onClick={() => setReloadKey((key) => key + 1)}>
              Try again
            </button>
          </div>
        )}

        {actionError && <p className="profile-error" role="alert">{actionError}</p>}

        {loading ? (
          <div className="profile-loading" role="status">Loading your profile...</div>
        ) : (
          <>
            <section className="profile-card">
              <div className="profile-banner">
                <span className="profile-status">
                  {user ? `Campus peer Â· ${formattedStatus}` : 'Campus peer profile'}
                </span>
              </div>
              <div className="profile-card-content">
                <div className="profile-identity">
                  <div className="profile-avatar">
                    {profileData?.avatarUrl ? (
                      <img src={profileData.avatarUrl} alt={`${displayName} profile`} />
                    ) : (
                      <Icon>person</Icon>
                    )}
                  </div>
                  {user && (
                    <button
                      className="profile-signout"
                      type="button"
                      onClick={handleSignOut}
                      disabled={signingOut}
                    >
                      <Icon>logout</Icon>
                      {signingOut ? 'Signing out...' : 'Sign out'}
                    </button>
                  )}
                </div>

                <div className="profile-name">
                  <div className="profile-name-line">
                    <h1>{displayName}</h1>
                    <span className={`profile-verification${isVerified ? ' verified' : ''}`} title={user ? `Verification ${formattedStatus}` : 'Sign in to manage your profile'}>
                      <Icon filled>{isVerified ? 'verified' : 'person'}</Icon>
                    </span>
                  </div>
                  <p>{user ? email : 'Sign in to view your account details'}{user && <> <span>Â·</span> Member since {memberSince}</>}</p>
                </div>

                <div className="profile-stats">
                  <div>
                    <strong><Icon filled>star</Icon>{averageRating}</strong>
                    <span>Rating</span>
                  </div>
                  <div>
                    <strong><Icon>swap_horiz</Icon>{profileData?.sessions.length ?? 0}</strong>
                    <span>Exchanges</span>
                  </div>
                  <div>
                    <strong><Icon>school</Icon>{profileData?.skills.length ?? 0}</strong>
                    <span>Listings</span>
                  </div>
                </div>

                <button className="profile-contact" type="button" onClick={() => navigate('/skill-listing')}>
                  <span className="profile-contact-icon"><Icon>arrow_forward</Icon></span>
                  <span>Offer a skill</span>
                </button>
              </div>
            </section>

            <section className="profile-balance">
              <div className="profile-balance-icon"><Icon filled>monetization_on</Icon></div>
              <div>
                <h2>Time-credit exchange</h2>
                <p>1 credit = 1 hour of peer learning</p>
              </div>
              <strong>{formattedBalance}</strong>
            </section>

            <section className="profile-skills">
              <div className="profile-section-heading">
                <div>
                  <h2>Skills offered</h2>
                </div>
                <span>{profileData?.skills.length ?? 0} listings</span>
              </div>

              {profileData?.skills.length ? (
                <div className="profile-skills-list">
                  {profileData.skills.map((skill) => (
                    <article className="profile-skill-card" key={skill.id}>
                      <div className="profile-skill-icon"><Icon>school</Icon></div>
                      <div className="profile-skill-copy">
                        <h3>{skill.title}</h3>
                        <p>{skill.description || skill.category}</p>
                        <span>{skill.category} Â· {skill.status}</span>
                      </div>
                      <strong>{Number(skill.credit_rate).toFixed(2)} Cr</strong>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon="school"
                  title="No skills listed yet"
                  text="Your skill listings will appear here when you add them."
                />
              )}
            </section>
          </>
        )}
      </main>
    </Screen>
  )
}

