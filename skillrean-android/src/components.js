import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { colors } from './theme'

export function PageTitle({ title, subtitle, action }) {
  return (
    <View style={styles.titleRow}>
      <View style={styles.titleCopy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  )
}

export function ActionButton({ label, onPress, disabled, secondary }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondaryButton,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.pressedButton,
      ]}
    >
      {disabled ? <ActivityIndicator color={secondary ? colors.primary : '#fff'} /> : (
        <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{label}</Text>
      )}
    </Pressable>
  )
}

export function Field({ label, value, onChangeText, placeholder, multiline, keyboardType, autoCapitalize }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize || 'sentences'}
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8b978e"
        style={[styles.input, multiline && styles.multilineInput]}
        value={value}
      />
    </View>
  )
}

export function Notice({ children, error }) {
  if (!children) return null
  return (
    <View style={[styles.notice, error && styles.errorNotice]}>
      <Text style={[styles.noticeText, error && styles.errorText]}>{children}</Text>
    </View>
  )
}

export function EmptyState({ title, message }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.subtitle}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  titleCopy: { flex: 1, paddingRight: 12 },
  title: { color: colors.ink, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 5 },
  button: { minHeight: 50, backgroundColor: colors.primary, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  secondaryButton: { backgroundColor: colors.primarySoft },
  disabledButton: { opacity: 0.65 },
  pressedButton: { opacity: 0.83 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryButtonText: { color: colors.primary },
  field: { marginBottom: 17 },
  fieldLabel: { color: colors.ink, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: { minHeight: 50, borderColor: colors.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, color: colors.ink, backgroundColor: colors.surface, fontSize: 15 },
  multilineInput: { minHeight: 112, paddingTop: 13, textAlignVertical: 'top' },
  notice: { backgroundColor: colors.primarySoft, borderRadius: 12, padding: 13, marginBottom: 15 },
  errorNotice: { backgroundColor: colors.dangerSoft },
  noticeText: { color: colors.primary, fontSize: 14, lineHeight: 20 },
  errorText: { color: colors.danger },
  empty: { alignItems: 'center', padding: 26, backgroundColor: colors.surface, borderRadius: 16, borderColor: colors.border, borderWidth: 1 },
  emptyTitle: { color: colors.ink, fontSize: 17, fontWeight: '700', marginBottom: 4 },
})
