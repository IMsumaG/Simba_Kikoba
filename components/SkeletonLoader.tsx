import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export interface SkeletonLoaderProps {
  /**
   * Width of skeleton (number or percentage string)
   * @default '100%'
   */
  width?: number | string;

  /**
   * Height of skeleton
   * @default 12
   */
  height?: number;

  /**
   * Border radius for skeleton
   * @default 4
   */
  borderRadius?: number;

  /**
   * Vertical margin between skeletons in a list
   * @default 0
   */
  marginVertical?: number;

  /**
   * Number of skeleton items to render
   * @default 1
   */
  count?: number;

  /**
   * Additional style properties
   */
  style?: any;
}

/**
 * SkeletonLoader Component
 * 
 * Displays a skeleton loader (placeholder) while content is loading.
 * Used for table rows, list items, and card contents.
 * 
 * @example
 * <SkeletonLoader height={40} count={3} marginVertical={8} />
 * 
 * @example
 * <SkeletonLoader width={150} height={20} borderRadius={4} />
 */
export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 12,
  borderRadius = 4,
  marginVertical = 0,
  count = 1,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.skeleton,
            {
              width,
              height,
              borderRadius,
              backgroundColor: colors.backgroundMuted,
              marginVertical: index > 0 ? marginVertical : 0,
            },
            style,
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
});
