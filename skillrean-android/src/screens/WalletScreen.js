import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import { EmptyState, PageTitle } from '../components'
import { colors } from '../theme'

export default function WalletScreen({ supabase, user }) {
  const [balance, setBalance] = useState(null)
  const [ledger, setLedger] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const loadWallet = async () => {
      setLoading(true)
      setError('')
      try {
        const [balanceResult, ledgerResult] = await Promise.all([
          supabase.from('credit_balances').select('balance').eq('user_id', user.id).maybeSingle(),
          supabase.from('credit_ledger').select('id,amount,entry_type,description,created_at')
            .eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        ])
        if (balanceResult.error) throw balanceResult.error
        if (ledgerResult.error) throw ledgerResult.error
        if (active) {
          setBalance(Number(balanceResult.data?.balance || 0))
          setLedger(ledgerResult.data || [])
        }
      } catch (requestError) {
        console.error('Unable to load wallet:', requestError)
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load wallet.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadWallet()
    return () => { active = false }
  }, [supabase, user.id])

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
      <PageTitle subtitle="Your time-credit balance and recent activity." title="Wallet" />
      {error ? <Text accessibilityRole="alert" style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} /> : (
        <>
          <View style={{ backgroundColor: colors.primary, borderRadius: 20, marginBottom: 24, padding: 22 }}>
            <Text style={{ color: '#d9eddf', fontSize: 13, fontWeight: '700' }}>TIME-CREDIT BALANCE</Text>
            <Text style={{ color: '#fff', fontSize: 31, fontWeight: '800', marginTop: 10 }}>{balance.toFixed(2)} Credits</Text>
            <Text style={{ color: '#d9eddf', fontSize: 13, marginTop: 7 }}>Balance from your credit ledger</Text>
          </View>
          <Text style={{ color: colors.ink, fontSize: 19, fontWeight: '800', marginBottom: 12 }}>Recent activity</Text>
          {ledger.length ? ledger.map((entry) => (
            <View key={entry.id} style={{ alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9, padding: 14 }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ color: colors.ink, fontWeight: '700' }}>{entry.description}</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 5 }}>{new Date(entry.created_at).toLocaleDateString()} · {entry.entry_type.replaceAll('_', ' ')}</Text>
              </View>
              <Text style={{ color: Number(entry.amount) < 0 ? colors.danger : colors.primary, fontWeight: '800' }}>
                {Number(entry.amount) > 0 ? '+' : ''}{Number(entry.amount).toFixed(2)}
              </Text>
            </View>
          )) : <EmptyState message="Your credit activity will appear here." title="No activity yet" />}
        </>
      )}
    </ScrollView>
  )
}
