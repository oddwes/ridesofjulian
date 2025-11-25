import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';

type HeaderProps = {
  onProfilePress?: () => void;
};

export function Header({ onProfilePress }: HeaderProps) {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const profilePicUrl = session?.user?.user_metadata?.avatar_url;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <Pressable style={styles.addButton}>
        <View style={styles.plusIcon}>
          <Text style={styles.plusText}>+</Text>
        </View>
      </Pressable>

      <Text style={styles.title}>TRAINHARD</Text>

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
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#1e293b',
  },
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
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

