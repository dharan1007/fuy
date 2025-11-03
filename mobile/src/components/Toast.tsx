import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore, Toast } from '../store/appStore';
import { COLORS, SPACING, FONT_SIZES } from '../constants/index';
import { Ionicons } from '@expo/vector-icons';

const ToastComponent: React.FC = () => {
  const { top } = useSafeAreaInsets();
  const toasts = useAppStore((state) => state.toasts);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { top: top + SPACING.md }]}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </View>
  );
};

interface ToastItemProps {
  toast: Toast;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast }) => {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'information-circle';
    }
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return COLORS.success;
      case 'error':
        return COLORS.danger;
      case 'warning':
        return COLORS.warning;
      case 'info':
      default:
        return COLORS.info;
    }
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: getBackgroundColor(),
        },
      ]}
    >
      <Ionicons
        name={getIcon() as any}
        size={20}
        color={COLORS.white}
        style={styles.icon}
      />
      <Text style={styles.message}>{toast.message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 9999,
    pointerEvents: 'none',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.md,
  },
  icon: {
    marginRight: SPACING.md,
  },
  message: {
    flex: 1,
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
});

export default ToastComponent;
