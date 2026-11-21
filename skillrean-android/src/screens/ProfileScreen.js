import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import { ActionButton, EmptyState, Notice, PageTitle } from '../components'
import { colors } from '../theme'

export default function ProfileScreen({ supabase, user, actionError, onSignOut }) {
  const [profile, setProfile] = useState(null)
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const loadProfile = async () => {
      setLoading(true)
      setError('')
      try {
        const [profileResult, skillsResult] = await Promise.all([
          supabase.from('profiles').select('display_name,campus_email,verification_status').eq('id', user.id).maybeSingle(),
          supabase.from('skills').select('id,title,category,status,credit_rate').eq('owner_id', user.id).order('created_at', { ascending: false }),
        ])
        if (profileResult.error) throw profileResult.error
        if (skillsResult.error) throw skillsResult.error
        if (active) {
          setProfile(profileResult.data)
          setSkills(skillsResult.data || [])
        }
      } catch (requestError) {
        console.error('Unable to load profile:', requestError)
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load profile.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadProfile()
    return () => { active = false }
  }, [supabase, user.id])

  const displayName = profile?.display_name || user.user_metadata?.full_name || user.email || 'Campus member'

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
      <PageTitle subtitle="Your Skilearn account and skill listings." title="Profile" />
      <Notice error>{actionError}</Notice>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} /> : (
        <>
          <View style={{ alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, marginBottom: 22, padding: 20 }}>
            <View style={{ alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 36, height: 72, justifyContent: 'center', width: 72 }}>
              <Text style={{ color: colors.primary, fontSize: 29, fontWeight: '800' }}>{displayName.slice(0, 1).toUpperCase()}</Text>
            </View>
            <Text style={{ color: colors.ink, fontSize: 20, fontWeight: '800', marginTop: 12 }}>{displayName}</Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>{profile?.campus_email || user.email}</Text>
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700', marginTop: 9 }}>
              Verification: {profile?.verification_status || 'pending'}
            </Text>
          </View>
          <Text style={{ color: colors.ink, fontSize: 19, fontWeight: '800', marginBottom: 12 }}>My skills</Text>
          {skills.length ? skills.map((skill) => (
            <View key={skill.id} style={{ backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, marginBottom: 9, padding: 14 }}>
              <Text style={{ color: colors.ink, fontWeight: '800' }}>{skill.title}</Text>
              <Text style={{ color: colors.muted, fontSize: 13, marginTop: 5 }}>{skill.category} · {skill.status} · {Number(skill.credit_rate).toFixed(2)} Cr/hr</Text>
            </View>
          )) : <EmptyState message="Offer a skill to start sharing your expertise." title="No skills listed" />}
          <View style={{ height: 22 }} />
          <ActionButton label="Sign out" onPress={onSignOut} secondary />
        </>
      )}
    </ScrollView>
  )
}
