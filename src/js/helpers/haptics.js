/**
 * Haptic feedback helpers — uses Vibration API when available.
 * Falls back silently on unsupported devices.
 */
export const haptic = {
  /** Light tap — tab switch, toggle */
  light: () => navigator.vibrate?.(10),
  /** Medium tap — stepper +/-, card action */
  medium: () => navigator.vibrate?.(25),
  /** Heavy tap — delete, error */
  heavy: () => navigator.vibrate?.(50),
  /** Success pattern — workout complete, PR */
  success: () => navigator.vibrate?.([10, 50, 20]),
  /** Warning pattern — rest timer end */
  warning: () => navigator.vibrate?.([25, 40, 25, 40, 25]),
};
