import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { useEffect, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { connectStrava, disconnectStrava, ensureValidStravaToken } from '../utils/StravaUtil';
import { StravaIcon } from '../components/StravaIcon';

type ProfileScreenProps = {
  onClose: () => void;
};

export function ProfileScreen({ onClose }: ProfileScreenProps) {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const [ftp, setFtp] = useState<string>('');
  const [ftpInput, setFtpInput] = useState<string>('');
  const [ftpInputFocused, setFtpInputFocused] = useState(false);
  const [ftpIsDirty, setFtpIsDirty] = useState(false);
  const [ftpIsSaving, setFtpIsSaving] = useState(false);
  const [ftpShowSuccess, setFtpShowSuccess] = useState(false);
  const [stravaConnected, setStravaConnected] = useState(false);

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
          const ftpValue = String(entries[0].value);
          setFtp(ftpValue);
          setFtpInput(ftpValue);
        }
      }
    };

    fetchFtp();
  }, [session?.user?.id]);

  useEffect(() => {
    const checkStrava = async () => {
      const hasValidToken = await ensureValidStravaToken();
      setStravaConnected(hasValidToken);
    };
    checkStrava();
  }, []);

  const handleFtpInputChange = (text: string) => {
    setFtpInput(text);
    if (!ftpIsDirty && text !== ftp) {
      setFtpIsDirty(true);
    }
  };

  const handleFtpInputBlur = () => {
    const trimmed = ftpInput.trim();
    if (!trimmed) {
      setFtpInput(ftp);
      setFtpIsDirty(false);
      return;
    }
    const value = parseInt(trimmed, 10);
    if (Number.isNaN(value) || value <= 0) {
      setFtpInput(ftp);
      setFtpIsDirty(false);
      return;
    }
    
    const ftpValue = String(value);
    setFtpInput(ftpValue);
    
    if (ftpValue !== ftp) {
      setFtpIsDirty(true);
    } else {
      setFtpIsDirty(false);
    }
  };

  const handleSaveFtp = async () => {
    if (!session?.user?.id || !ftpIsDirty) return;
    
    const value = parseInt(ftpInput, 10);
    if (Number.isNaN(value) || value <= 0) return;
    
    setFtpIsSaving(true);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: existing } = await supabase
        .from('stats')
        .select('data')
        .eq('user_id', session.user.id)
        .single();

      const existingFtp = existing?.data?.ftp || {};
      const ftpData = {
        ftp: {
          [today]: value,
          ...existingFtp
        }
      };

      if (existing) {
        await supabase
          .from('stats')
          .update({ data: ftpData })
          .eq('user_id', session.user.id);
      } else {
        await supabase
          .from('stats')
          .insert({
            user_id: session.user.id,
            data: ftpData
          });
      }
      
      setFtp(String(value));
      setFtpIsDirty(false);
      setFtpIsSaving(false);
      setFtpShowSuccess(true);
      
      setTimeout(() => {
        setFtpShowSuccess(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to save FTP:', error);
      setFtpIsSaving(false);
    }
  };

  const handleClose = () => {
    setFtpIsDirty(false);
    setFtpIsSaving(false);
    setFtpShowSuccess(false);
    setFtpInput(ftp);
    onClose();
  };

  const handleStravaPress = async () => {
    if (stravaConnected) {
      await disconnectStrava();
      setStravaConnected(false);
    } else {
    const ok = await connectStrava();
    if (ok) {
      setStravaConnected(true);
      }
    }
  };

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
        <Pressable onPress={handleClose} style={styles.closeButton}>
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
            <View style={styles.ftpInputContainer}>
              {ftpIsDirty && !ftpIsSaving && !ftpShowSuccess && (
                <Pressable onPress={handleSaveFtp} style={styles.ftpSaveButton}>
                  <Feather name="save" size={20} color="#3b82f6" />
                </Pressable>
              )}
              {ftpIsSaving && (
                <View style={styles.ftpSaveButton}>
                  <ActivityIndicator size="small" color="#3b82f6" />
                </View>
              )}
              {ftpShowSuccess && (
                <View style={styles.ftpSaveButton}>
                  <Feather name="check" size={20} color="#10b981" />
                </View>
              )}
              <TextInput
                style={[styles.ftpInput, ftpInputFocused && styles.ftpInputFocused]}
                value={ftpInput}
                onChangeText={handleFtpInputChange}
                onBlur={() => {
                  handleFtpInputBlur();
                  setFtpInputFocused(false);
                }}
                onFocus={() => setFtpInputFocused(true)}
                keyboardType="numeric"
                placeholder="--"
                placeholderTextColor="#6b7280"
              />
              <Text style={styles.ftpUnit}>W</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connected Services</Text>

          <Pressable
            style={[styles.serviceButton, styles.stravaButton]}
            onPress={handleStravaPress}
          >
            <Text style={styles.serviceButtonText}>
              {stravaConnected ? 'Disconnect from ' : 'Connect to '}
            </Text>
            <StravaIcon size={20} />
          </Pressable>

          <Pressable style={[styles.serviceButton, styles.wahooButton]}>
            <Text style={styles.serviceButtonText}>Connect to</Text>
            <Image
              source={require('../../assets/wahoo.png')}
              style={styles.wahooIcon}
              resizeMode="contain"
            />
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
  ftpInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ftpInput: {
    minWidth: 40,
    padding: 4,
    borderWidth: 0,
    borderRadius: 6,
    backgroundColor: 'transparent',
    color: '#f3f4f6',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'right',
  },
  ftpInputFocused: {
    backgroundColor: '#374151',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  ftpUnit: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3b82f6',
  },
  ftpSaveButton: {
    marginRight: 2,
    padding: 4,
  },
  serviceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  serviceButtonDisabled: {
    opacity: 0.6,
  },
  stravaButton: {
    backgroundColor: '#FC4C02',
  },
  wahooButton: {
    backgroundColor: '#3b82f6',
  },
  wahooIcon: {
    height: 16,
    width: 70,
    marginLeft: -8,
    marginBottom: 2,
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

