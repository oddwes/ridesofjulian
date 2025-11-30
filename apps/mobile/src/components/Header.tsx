import { Image, Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

type HeaderProps = {
  onProfilePress?: () => void;
  onAddWorkoutPress?: () => void;
  onMenuPress?: () => void;
  isCreatingWorkout?: boolean;
};

export function Header({ onProfilePress, onAddWorkoutPress, onMenuPress, isCreatingWorkout }: HeaderProps) {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const profilePicUrl = session?.user?.user_metadata?.avatar_url;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.leftGroup}>
        <Pressable style={styles.iconButton} onPress={onMenuPress}>
          <View style={styles.menuIcon}>
            <Feather name="menu" size={22} color="#3b82f6" />
          </View>
        </Pressable>

        <Pressable 
          style={styles.iconButton} 
          onPress={onAddWorkoutPress}
          disabled={isCreatingWorkout}
        >
          <View style={[styles.plusIcon, isCreatingWorkout && styles.plusIconDisabled]}>
            {isCreatingWorkout ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <Text style={styles.plusText}>+</Text>
            )}
          </View>
        </Pressable>
      </View>

      <View style={[styles.titleContainer, { top: insets.top + 20 }]}>
        <Text style={styles.title}>TRAINHARD</Text>
      </View>

      <Pressable onPress={onProfilePress} style={styles.profileButton}>
        {profilePicUrl ? (
          <Image source={{ uri: profilePicUrl }} style={styles.profileImage} />
        ) : (
          <View style={styles.profilePlaceholder} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#1e293b',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  menuIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  plusIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusIconDisabled: {
    opacity: 0.5,
  },
  plusText: {
    color: '#3b82f6',
    fontSize: 24,
    fontWeight: '600',
    marginTop: -2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  profileButton: {
    width: 40,
    height: 40,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  profilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#475569',
  },
});

