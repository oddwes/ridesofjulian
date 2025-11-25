import { ActivityIndicator, StyleSheet, View } from 'react-native';

export function LoadingSpinner({ size = 'large' }: { size?: 'small' | 'large' }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color="#ffffff" size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

