import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native'
import { ActionButton, Field, Notice } from '../components'
import { colors } from '../theme'

export default function LoginScreen({ supabase, configError }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState('email')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const sendCode = async () => {
    setError('')
    setNotice('')
    if (!supabase) {
      setError('Add the Supabase URL and anon key to skillrean-android/.env to enable sign-in.')
      return
    }
    if (!email.trim()) {
      setError('Enter your email address.')
      return
    }

    setBusy(true)
    try {
      const { error: requestError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      })
      if (requestError) throw requestError
      setStep('code')
      setCode('')
      setNotice(`A sign-in code was sent to ${email.trim()}.`)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to send the sign-in code.')
    } finally {
      setBusy(false)
    }
  }

  const verifyCode = async () => {
    setError('')
    setNotice('')
    setBusy(true)
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'email',
      })
      if (verifyError) throw verifyError
      if (!data.session) throw new Error('No active session was created. Request a new code and try again.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to verify the sign-in code.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '800', letterSpacing: 1.5 }}>CAMPUS SKILL EXCHANGE</Text>
        <Text style={{ color: colors.ink, fontSize: 38, fontWeight: '800', marginTop: 12 }}>Hello!</Text>
        <Text style={{ color: colors.muted, fontSize: 17, marginTop: 5, marginBottom: 28 }}>Welcome to Skilearn</Text>
        <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 20, borderColor: colors.border, borderWidth: 1 }}>
          <Text style={{ color: colors.ink, fontSize: 21, fontWeight: '800', marginBottom: 6 }}>
            {step === 'email' ? 'Login or sign up' : 'Check your email'}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: 20 }}>
            {step === 'email'
              ? 'Enter your email and we will send you a one-time sign-in code.'
              : `Enter the code sent to ${email.trim()}.`}
          </Text>
          {configError ? <Notice error>{configError}</Notice> : null}
          <Notice error>{error}</Notice>
          <Notice>{notice}</Notice>
          {step === 'email' ? (
            <>
              <Field
                autoCapitalize="none"
                keyboardType="email-address"
                label="Email address"
                onChangeText={setEmail}
                placeholder="student@university.edu"
                value={email}
              />
              <ActionButton disabled={busy} label="Email me a code" onPress={sendCode} />
            </>
          ) : (
            <>
              <Field
                autoCapitalize="none"
                keyboardType="number-pad"
                label="6-digit sign-in code"
                onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                value={code}
              />
              <ActionButton disabled={busy || code.length !== 6} label="Verify and continue" onPress={verifyCode} />
              <View style={{ height: 10 }} />
              <ActionButton disabled={busy} label="Resend code" onPress={sendCode} secondary />
              <Text onPress={() => { setStep('email'); setError(''); setNotice('') }} style={{ color: colors.primary, textAlign: 'center', marginTop: 18, fontWeight: '700' }}>
                Change email
              </Text>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
