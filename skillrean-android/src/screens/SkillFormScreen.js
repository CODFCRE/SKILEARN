import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { ActionButton, Field, Notice, PageTitle } from '../components'
import { colors } from '../theme'

export default function SkillFormScreen({ supabase, user, onDone, onCancel }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [rate, setRate] = useState('')
  const [format, setFormat] = useState('online')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const publish = async () => {
    setError('')
    const creditRate = Number(rate)
    if (title.trim().length < 2 || title.trim().length > 60) {
      setError('Skill title must be between 2 and 60 characters.')
      return
    }
    if (!category.trim() || !Number.isFinite(creditRate) || creditRate <= 0) {
      setError('Enter a category and a credit rate greater than zero.')
      return
    }

    setSaving(true)
    try {
      const { error: insertError } = await supabase.from('skills').insert({
        owner_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        category: category.trim(),
        credit_rate: creditRate,
        session_format: format,
        status: 'published',
      })
      if (insertError) throw insertError
      setSaved(true)
    } catch (requestError) {
      console.error('Unable to publish skill:', requestError)
      setError(requestError instanceof Error ? requestError.message : 'Unable to publish the skill.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      <PageTitle
        action={<Text onPress={onCancel} style={{ color: colors.primary, fontWeight: '700', padding: 8 }}>Cancel</Text>}
        subtitle="Share your expertise with other campus members."
        title="Offer a new skill"
      />
      <Notice error>{error}</Notice>
      {saved ? <Notice>Your skill listing has been published.</Notice> : null}
      <Field label="Skill title" onChangeText={setTitle} placeholder="e.g. Python and data structures" value={title} />
      <Field label="Description" multiline onChangeText={setDescription} placeholder="Describe what learners can expect." value={description} />
      <Field label="Category" onChangeText={setCategory} placeholder="e.g. Tech, Arts, Languages" value={category} />
      <Field keyboardType="decimal-pad" label="Credits per hour" onChangeText={setRate} placeholder="e.g. 1.5" value={rate} />
      <Text style={{ color: colors.ink, fontSize: 14, fontWeight: '700', marginBottom: 9 }}>Session format</Text>
      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        {[
          ['online', 'Online'],
          ['in_person', 'In person'],
          ['both', 'Either'],
        ].map(([value, label]) => {
          const selected = format === value
          return <Text key={value} onPress={() => setFormat(value)} style={{ backgroundColor: selected ? colors.primary : colors.surface, borderColor: selected ? colors.primary : colors.border, borderRadius: 12, borderWidth: 1, color: selected ? '#fff' : colors.ink, fontWeight: '700', marginRight: 8, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 10 }}>{label}</Text>
        })}
      </View>
      <ActionButton disabled={saving || saved} label={saved ? 'Listing published' : 'Publish skill listing'} onPress={publish} />
    </ScrollView>
  )
}
