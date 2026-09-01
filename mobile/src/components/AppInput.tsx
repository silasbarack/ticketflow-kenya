import { useState } from 'react';
import { KeyboardTypeOptions, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { FontSize, MIN_TOUCH_TARGET, Radius, Spacing } from '@/constants/spacing';

interface AppInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  editable?: boolean;
  multiline?: boolean;
}

export function AppInput({
  label,
  value,
  onChangeText,
  onBlur,
  error,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoComplete,
  editable = true,
  multiline = false,
}: AppInputProps) {
  const [hidden, setHidden] = useState(secureTextEntry);
  const inputId = `input-${label}`;

  return (
    <View style={styles.container}>
      <Text style={styles.label} nativeID={inputId}>
        {label}
      </Text>
      <View style={[styles.inputWrapper, !!error && styles.inputWrapperError, !editable && styles.disabled]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={Colors.textSecondary}
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          editable={editable}
          multiline={multiline}
          style={[styles.input, multiline && styles.multiline]}
          accessibilityLabelledBy={inputId}
          accessibilityLabel={label}
          accessibilityState={{ disabled: !editable }}
        />
        {secureTextEntry && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            style={styles.eyeButton}
          >
            <Feather name={hidden ? 'eye' : 'eye-off'} size={18} color={Colors.textSecondary} />
          </Pressable>
        )}
      </View>
      {!!error && (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.lg },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: Spacing.md,
  },
  inputWrapperError: {
    borderColor: Colors.error,
  },
  disabled: {
    backgroundColor: Colors.background,
    opacity: 0.7,
  },
  input: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.text,
    paddingVertical: Spacing.md,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  eyeButton: {
    padding: Spacing.xs,
  },
  error: {
    marginTop: Spacing.xs,
    fontSize: FontSize.xs,
    color: Colors.error,
  },
});
