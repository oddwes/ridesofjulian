import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface SlidingLoadingIndicatorProps {
  isLoading: boolean;
}

export function SlidingLoadingIndicator({ isLoading }: SlidingLoadingIndicatorProps) {
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (isLoading) {
      slideAnim.setValue(-100);
      Animated.loop(
        Animated.timing(slideAnim, {
          toValue: 400,
          duration: 1500,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [isLoading, slideAnim]);

  if (!isLoading) return null;

  return (
    <View style={styles.loadingContainer}>
      <Animated.View 
        style={[
          styles.loadingPill,
          { transform: [{ translateX: slideAnim }] }
        ]} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    height: 5,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
  },
  loadingPill: {
    width: 36,
    height: 5,
    backgroundColor: '#4b5563',
    borderRadius: 3,
  },
});

