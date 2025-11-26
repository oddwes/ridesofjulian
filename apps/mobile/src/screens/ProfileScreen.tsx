import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { useEffect, useState } from 'react';

type ProfileScreenProps = {
  onClose: () => void;
};

export function ProfileScreen({ onClose }: ProfileScreenProps) {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const [ftp, setFtp] = useState<number | null>(null);

  useEffect(() => {
    const fetchFtp = async () => {
      if (!session?.user?.id) return;
      
      const { data, error } = await supabase
        .from('stats')
        .select('data')
        .eq('user_id', session.user.id)
        .single();

      if (!error && data?.data?.ftp) {
        const entries = Object.entries(data.data.ftp as Record<string, number>)
          .map(([date, value]) => ({ date, value }))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        if (entries.length > 0) {
          setFtp(entries[0].value);
        }
      }
    };

    fetchFtp();
  }, [session?.user?.id]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (!session) return null;

  const user = session.user;
  const profilePicUrl = user?.user_metadata?.avatar_url;
  const fullName = user?.user_metadata?.full_name || 'User';
  const email = user?.email;

  return (
    <View style={[styles.container]}>
      <View style={styles.modalHandle} />
      
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.closeButton} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileSection}>
          {profilePicUrl ? (
            <Image source={{ uri: profilePicUrl }} style={styles.profileImage} />
          ) : (
            <View style={styles.profilePlaceholder} />
          )}
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FTP</Text>
          <View style={styles.ftpContainer}>
            <Text style={styles.ftpLabel}>Functional Threshold Power</Text>
            <Text style={styles.ftpValue}>{ftp ? `${ftp} W` : 'Not set'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connected Services</Text>
          
          <Pressable style={[styles.serviceButton, styles.stravaButton]}>
            <Text style={styles.serviceButtonText}>Connect to Strava</Text>
          </Pressable>

          <Pressable style={[styles.serviceButton, styles.wahooButton]}>
            <Text style={styles.serviceButtonText}>Connect to Wahoo</Text>
          </Pressable>
        </View>

        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e293b',
  },
  modalHandle: {
    width: 36,
    height: 5,
    backgroundColor: '#4b5563',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  profilePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#475569',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#9ca3af',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  ftpContainer: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ftpLabel: {
    fontSize: 16,
    color: '#ffffff',
  },
  ftpValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3b82f6',
  },
  serviceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  stravaButton: {
    backgroundColor: '#FC4C02',
  },
  wahooButton: {
    backgroundColor: '#3b82f6',
  },
  serviceButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  signOutButton: {
    margin: 16,
    paddingVertical: 12,
    backgroundColor: '#dc2626',
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

