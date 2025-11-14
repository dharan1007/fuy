import React from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/index';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  showPassword?: boolean;
  onShowPasswordChange?: (show: boolean) => void;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  rightIcon,
  onRightIconPress,
  containerStyle,
  secureTextEntry,
  showPassword,
  onShowPasswordChange,
  ...props
}) => {
  const isPassword = secureTextEntry && typeof showPassword !== 'undefined';

  return (
    <View style={containerStyle}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <View style={[
        styles.inputContainer,
        error ? styles.inputError : undefined,
      ]}>
        <TextInput
          {...props}
          secureTextEntry={isPassword ? !showPassword : secureTextEntry}
          style={[styles.input, props.style]}
          placeholderTextColor={COLORS.gray400}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => onShowPasswordChange?.(!showPassword)}
            style={styles.rightIcon}
          >
            <Ionicons
              name={showPassword ? 'eye' : 'eye-off'}
              size={20}
              color={COLORS.gray600}
            />
          </TouchableOpacity>
        )}
        {rightIcon && !isPassword && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIcon}
          >
            <Ionicons
              name={rightIcon as any}
              size={20}
              color={COLORS.gray600}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray800,
    marginBottom: SPACING.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: FONT_SIZES.base,
    color: COLORS.gray900,
    paddingVertical: SPACING.md,
  },
  rightIcon: {
    padding: SPACING.md,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  errorText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.danger,
    marginTop: SPACING.xs,
  },
});

export default Input;
