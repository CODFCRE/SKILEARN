import { useEffect, useState } from 'react'
import { EmptyState, Header, Icon, Screen } from '../../shared/components.jsx'
import { navigate } from '../../shared/lib/navigation.js'
import { supabase } from '../../shared/lib/supabase.js'

export function MemberProfile() {
  const memberId = window.history.state?.memberId
    || new URLSearchParams(window.location.search).get('memberId')
  const [member, setMember] = useState(null)
  const [skills, setSkills] = useState([])
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [startingCall, setStartingCall] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const loadMember = async () => {
      if (!supabase || !memberId) {
        setError(!supabase ? 'Supabase is not configured.' : 'No profile was selected.')
        setLoading(false)
        return
      }

      try {
        const [{ data: authData, error: authError }, profileResult, skillsResult] = await Promise.all([
          supabase.auth.getUser(),
          supabase.from('profiles')
            .select('id,display_name,avatar_path,verification_status,created_at')
            .eq('id', memberId)
            .maybeSingle(),
          supabase.from('skills')
            .select('id,title,description,category,credit_rate')
            .eq('owner_id', memberId)
            .eq('status', 'published')
            .order('created_at', { ascending: false }),
        ])
        if (authError) throw authError
        if (profileResult.error) throw profileResult.error
        if (skillsResult.error) throw skillsResult.error
        if (!profileResult.data) throw new Error('This profile is unavailable.')

        let avatarUrl = ''
        if (profileResult.data.avatar_path) {
          const { data: avatar, error: avatarError } = await supabase.storage
            .from('files')
            .createSignedUrl(profileResult.data.avatar_path, 3600)
          if (avatarError) throw avatarError
          avatarUrl = avatar.signedUrl
        }

        if (active) {
          setUserId(authData.user?.id || null)
          setMember({ ...profileResult.data, avatarUrl })
          setSkills(skillsResult.data || [])
        }
      } catch (requestError) {
        console.error('Unable to load member profile:', requestError)
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load this profile.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadMember()
    return () => {
      active = false
    }
  }, [memberId])

  const startCall = async () => {
    if (!supabase || !member || !userId || startingCall) return
    setStartingCall(true)
    setError('')
    try {
      const { data, error: callError } = await supabase
        .from('call_sessions')
        .insert({ caller_id: userId, recipient_id: member.id, status: 'ringing' })
        .select('id')
        .single()
      if (callError) throw callError
      navigate(`/call?callId=${encodeURIComponent(data.id)}`, {
        callId: data.id,
        direction: 'outgoing',
      })
    } catch (requestError) {
      console.error('Unable to start call:', requestError)
      setError(requestError instanceof Error ? requestError.message : 'Unable to start this call.')
    } finally {
      setStartingCall(false)
    }
  }

  const openMessages = () => {
    if (!userId || !member) return
    navigate('/messages', { memberId: member.id })
  }

  const displayName = member?.display_name || 'Campus member'

  return (
    <Screen active="exchange" className="member-profile-shell">
      <Header
        back
        rightAction={userId && userId !== member?.id && (
          <button
            className="member-call-request"
            type="button"
            onClick={startCall}
            disabled={startingCall || !member}
          >
            <Icon>videocam</Icon>
            {startingCall ? 'Requesting...' : 'Request video call'}
          </button>
        )}
      />
      <main className="profile-page member-profile-page">
        {loading ? (
          <div className="profile-loading" role="status">Loading profile...</div>
        ) : error && !member ? (
          <div className="profile-error" role="alert">{error}</div>
        ) : member ? (
          <>
            <section className="profile-card">
              <div className="profile-banner">
                <span className="profile-status">Skilearn member</span>
              </div>
              <div className="profile-card-content">
                <div className="profile-identity">
                  <div className="profile-avatar">
                    {member.avatarUrl
                      ? <img src={member.avatarUrl} alt={`${displayName} profile`} />
                      : <Icon>person</Icon>}
                  </div>
                  <div className="member-profile-actions">
                    {userId && userId !== member.id && (
                      <button
                        className="button primary-action"
                        type="button"
                        onClick={openMessages}
                      >
                        <Icon>chat</Icon>
                        Message
                      </button>
                    )}
                  </div>
                </div>
                <div className="profile-name">
                  <div className="profile-name-line">
                    <h1>{displayName}</h1>
                    {member.verification_status === 'verified' && (
                      <span className="profile-verification verified" title="Verified member">
                        <Icon filled>verified</Icon>
                      </span>
                    )}
                  </div>
                  <p>Skilearn member since {new Date(member.created_at).toLocaleDateString(undefined, {
                    month: 'long',
                    year: 'numeric',
                  })}</p>
                </div>
                <div className="profile-stats">
                  <div><strong><Icon>school</Icon>{skills.length}</strong><span>Skills offered</span></div>
                </div>
              </div>
            </section>

            {error && <div className="profile-error" role="alert">{error}</div>}

            <section className="profile-skills">
              <div className="profile-section-heading">
                <div><h2>Skills offered</h2></div>
                <span>{skills.length} listings</span>
              </div>
              {skills.length ? (
                <div className="profile-skills-list">
                  {skills.map((skill) => (
                    <article
                      className="profile-skill-card member-skill-card"
                      key={skill.id}
                      role="link"
                      tabIndex={0}
                      onClick={() => navigate('/skill-detail', { skillId: skill.id })}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          navigate('/skill-detail', { skillId: skill.id })
                        }
                      }}
                    >
                      <span className="profile-skill-icon"><Icon>school</Icon></span>
                      <span className="profile-skill-copy">
                        <h3>{skill.title}</h3>
                        <p>{skill.description || skill.category}</p>
                        <span>{skill.category}</span>
                      </span>
                      <strong>{Number(skill.credit_rate).toFixed(2)} Cr/hr</strong>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState icon="school" title="No skills listed yet" text="This member has not published any skills." />
              )}
            </section>
          </>
        ) : null}
      </main>
    </Screen>
  )
}
