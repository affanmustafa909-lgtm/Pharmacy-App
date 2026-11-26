import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

type HapticStyle = NonNullable<Parameters<typeof ReactNativeHapticFeedback.trigger>[0]>;

const options = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

export const Haptics = {
  ImpactFeedbackStyle: {
    Light: 'impactLight',
    Medium: 'impactMedium',
    Heavy: 'impactHeavy',
  } as const,
  NotificationFeedbackType: {
    Success: 'notificationSuccess',
    Warning: 'notificationWarning',
    Error: 'notificationError',
  } as const,
  impactAsync(style: HapticStyle) {
    try {
      ReactNativeHapticFeedback.trigger(style, options);
    } catch {
      // Emulator / devices without vibrator should not crash the app.
    }
  },
  notificationAsync(type: HapticStyle) {
    try {
      ReactNativeHapticFeedback.trigger(type, options);
    } catch {
      // Ignore haptic failures.
    }
  },
};
