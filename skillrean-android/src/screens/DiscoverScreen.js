import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native'
import { EmptyState, PageTitle } from '../components'
import { colors } from '../theme'

export default function DiscoverScreen({ supabase, user, onCreateSkill }) {
  const [skills, setSkills] = useState([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const loadSkills = async () => {
      setLoading(true)
      setError('')
      try {
        const { data: rows, error: skillError } = await supabase
          .from('skills')
          .select('id,owner_id,title,description,category,credit_rate,session_format')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
        if (skillError) throw skillError

        const ownerIds = [...new Set((rows || []).map((skill) => skill.owner_id))]
        const { data: owners, error: ownersError } = ownerIds.length
          ? await supabase.from('profiles').select('id,display_name').in('id', ownerIds)
          : { data: [], error: null }
        if (ownersError) throw ownersError
        const names = Object.fromEntries((owners || []).map((profile) => [profile.id, profile.display_name]))
        if (active) setSkills((rows || []).map((skill) => ({
          ...skill,
          ownerName: names[skill.owner_id] || 'Campus member',
        })))
      } catch (requestError) {
        console.error('Unable to load published skills:', requestError)
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load skills.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadSkills()
    return () => { active = false }
  }, [supabase, user.id])

  const categories = useMemo(() => ['All', ...new Set(skills.map((skill) => skill.category).filter(Boolean))], [skills])
  const visibleSkills = skills.filter((skill) => (
    (category === 'All' || skill.category === category)
    && `${skill.title} ${skill.description || ''} ${skill.ownerName}`.toLowerCase().includes(query.trim().toLowerCase())
  ))

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      <PageTitle
        action={<Text onPress={onCreateSkill} style={{ color: colors.primary, fontWeight: '800', padding: 8 }}>+ Offer a skill</Text>}
        subtitle="Learn something new or share what you know."
        title="Discover"
      />
      <TextInput
        accessibilityLabel="Search skills"
        onChangeText={setQuery}
        placeholder="Search skills or people..."
        placeholderTextColor="#8b978e"
        style={{ backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 13, borderWidth: 1, color: colors.ink, fontSize: 15, minHeight: 50, paddingHorizontal: 15 }}
        value={query}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 15 }}>
        {categories.map((item) => {
          const selected = category === item
          return (
            <Text
              key={item}
              onPress={() => setCategory(item)}
              style={{ backgroundColor: selected ? colors.primary : colors.surface, borderColor: selected ? colors.primary : colors.border, borderRadius: 18, borderWidth: 1, color: selected ? '#fff' : colors.ink, marginRight: 8, overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 9, fontWeight: '700' }}
            >
              {item}
            </Text>
          )
        })}
      </ScrollView>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} /> : visibleSkills.length ? (
        visibleSkills.map((skill) => (
          <View key={skill.id} style={{ backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 17, borderWidth: 1, marginBottom: 12, padding: 17 }}>
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>{skill.category}</Text>
            <Text style={{ color: colors.ink, fontSize: 19, fontWeight: '800', marginTop: 7 }}>{skill.title}</Text>
            <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 5 }}>{skill.description || 'Connect with a campus member to learn more.'}</Text>
            <View style={{ borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, paddingTop: 12 }}>
              <Text style={{ color: colors.muted, fontSize: 13 }}>{skill.ownerName} · {skill.session_format.replace('_', ' ')}</Text>
              <Text style={{ color: colors.primary, fontWeight: '800' }}>{Number(skill.credit_rate).toFixed(2)} Cr/hr</Text>
            </View>
          </View>
        ))
      ) : (
        <EmptyState
          message={skills.length ? 'Try another search or category.' : 'Published campus skill listings will appear here.'}
          title={skills.length ? 'No matching skills' : 'No skills available yet'}
        />
      )}
    </ScrollView>
  )
}
