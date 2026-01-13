import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ThemedText } from './themed-text';

export interface LoadingSpinnerProps {
  /**
   * Size of the spinner ('small' | 'large')
   * @default 'large'
   */
  size?: 'small' | 'large';

  /**
   * Loading text to display below spinner
   */
  text?: string;

  /**
   * Whether spinner is centered (full screen overlay style)
   * @default false
   */
  centered?: boolean;

  /**
   * Custom color for spinner
   */
  color?: string;

  /**
   * Whether to show semi-transparent overlay background
   * @default false
   */
  overlay?: boolean;
}

/**
 * LoadingSpinner Component
 * 
 * Displays an activity indicator with optional text.
 * Can be used as full-screen overlay or inline loading indicator.
 * 
 * @example
 * <LoadingSpinner text="Loading..." centered />
 * 
 * @example
 * <LoadingSpinner size="small" />
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  text,
  centered = false,
  color,
  overlay = false,
}) => {
  const { colors } = useTheme();
  const spinnerColor = color || colors.primary;

  if (centered) {
    return (
      <View style={[styles.centeredContainer, overlay && styles.overlay]}>
        <View style={styles.spinnerContent}>
          <ActivityIndicator size={size} color={spinnerColor} />
          {text && (
            <ThemedText style={styles.loadingText}>
              {text}
            </ThemedText>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.inlineContainer}>
      <ActivityIndicator size={size} color={spinnerColor} />
      {text && (
        <ThemedText style={styles.loadingText}>
          {text}
        </ThemedText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    position: 'absolute',
    zIndex: 1000,
  },
  spinnerContent: {
    alignItems: 'center',
    gap: 12,
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 14,
    marginLeft: 8,
  },
});
