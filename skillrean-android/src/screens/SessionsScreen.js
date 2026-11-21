import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import { EmptyState, PageTitle } from '../components'
import { colors } from '../theme'

const tabs = ['Upcoming', 'Completed']

export default function SessionsScreen({ supabase, user }) {
  const [sessions, setSessions] = useState([])
  const [tab, setTab] = useState('Upcoming')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const loadSessions = async () => {
      setLoading(true)
      setError('')
      try {
        const { data: rows, error: queryError } = await supabase
          .from('sessions')
          .select('id,skill_id,mentor_id,learner_id,starts_at,status,credits_reserved')
          .or(`mentor_id.eq.${user.id},learner_id.eq.${user.id}`)
          .order('starts_at', { ascending: false })
        if (queryError) throw queryError
        const skillIds = [...new Set((rows || []).map((session) => session.skill_id))]
        const peerIds = [...new Set((rows || []).map((session) => (
          session.mentor_id === user.id ? session.learner_id : session.mentor_id
        )))]
        const [skillsResult, peersResult] = await Promise.all([
          skillIds.length ? supabase.from('skills').select('id,title').in('id', skillIds) : { data: [], error: null },
          peerIds.length ? supabase.from('profiles').select('id,display_name').in('id', peerIds) : { data: [], error: null },
        ])
        if (skillsResult.error) throw skillsResult.error
        if (peersResult.error) throw peersResult.error
        const skillNames = Object.fromEntries((skillsResult.data || []).map((skill) => [skill.id, skill.title]))
        const peerNames = Object.fromEntries((peersResult.data || []).map((peer) => [peer.id, peer.display_name]))
        if (active) setSessions((rows || []).map((session) => ({
          ...session,
          skillTitle: skillNames[session.skill_id] || 'Skill session',
          peerName: peerNames[session.mentor_id === user.id ? session.learner_id : session.mentor_id] || 'Campus member',
        })))
      } catch (requestError) {
        console.error('Unable to load sessions:', requestError)
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load sessions.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadSessions()
    return () => { active = false }
  }, [supabase, user.id])

  const visible = sessions.filter((session) => tab === 'Completed'
    ? session.status === 'completed'
    : !['completed', 'cancelled'].includes(session.status))

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
      <PageTitle subtitle="Your scheduled mentoring and completed activity." title="My sessions" />
      <View style={{ flexDirection: 'row', marginBottom: 17 }}>
        {tabs.map((item) => {
          const selected = item === tab
          return <Text key={item} onPress={() => setTab(item)} style={{ backgroundColor: selected ? colors.primary : colors.surface, borderRadius: 12, color: selected ? '#fff' : colors.ink, fontWeight: '700', marginRight: 8, overflow: 'hidden', paddingHorizontal: 16, paddingVertical: 10 }}>{item}</Text>
        })}
      </View>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} /> : visible.length ? visible.map((session) => (
        <View key={session.id} style={{ backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, marginBottom: 12, padding: 16 }}>
          <Text style={{ color: colors.ink, fontSize: 17, fontWeight: '800' }}>{session.skillTitle}</Text>
          <Text style={{ color: colors.muted, marginTop: 6 }}>With {session.peerName}</Text>
          <Text style={{ color: colors.muted, fontSize: 13, marginTop: 8 }}>{new Date(session.starts_at).toLocaleString()} · {session.status.replaceAll('_', ' ')}</Text>
          <Text style={{ color: colors.primary, fontWeight: '800', marginTop: 10 }}>{Number(session.credits_reserved).toFixed(2)} Cr</Text>
        </View>
      )) : (
        <EmptyState
          message={tab === 'Completed' ? 'Your completed sessions will appear here.' : 'Your scheduled sessions will appear here.'}
          title={tab === 'Completed' ? 'No completed sessions' : 'No upcoming sessions'}
        />
      )}
    </ScrollView>
  )
}
