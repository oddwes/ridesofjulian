import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { useEffect, useState, useRef } from 'react';
import { Feather } from '@expo/vector-icons';
import { connectStrava, disconnectStrava, ensureValidStravaToken } from '@ridesofjulian/shared/utils/StravaUtil/mobile';
import { StravaIcon } from '../components/StravaIcon';
import { connectWahoo, disconnectWahoo, ensureValidWahooToken } from '../utils/WahooUtil';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [weight, setWeight] = useState<string>('');
  const [weightInput, setWeightInput] = useState<string>('');
  const [weightInputFocused, setWeightInputFocused] = useState(false);
  const [weightIsDirty, setWeightIsDirty] = useState(false);
  const [weightIsSaving, setWeightIsSaving] = useState(false);
  const [weightShowSuccess, setWeightShowSuccess] = useState(false);
  const [stravaConnected, setStravaConnected] = useState(false);
  const [wahooConnected, setWahooConnected] = useState(false);
  const [openaiApiKey, setOpenaiApiKey] = useState<string>('');
  const [openaiApiKeyInput, setOpenaiApiKeyInput] = useState<string>('');
  const [openaiApiKeyInputFocused, setOpenaiApiKeyInputFocused] = useState(false);
  const [openaiApiKeyIsDirty, setOpenaiApiKeyIsDirty] = useState(false);
  const ftpInputRef = useRef<TextInput>(null);
  const weightInputRef = useRef<TextInput>(null);
  const openaiApiKeyInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const fetchFtp = async () => {
      if (!session?.user?.id) return;
      
      const { data, error } = await supabase
        .from('stats')
        .select('data')
        .eq('user_id', session.user.id)
        .single();

      if (!error && data?.data) {
        const statsData = data.data as { ftp?: Record<string, number>; weight?: Record<string, number> };

        if (statsData.ftp) {
          const ftpEntries = Object.entries(statsData.ftp)
            .map(([date, value]) => ({ date, value }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          if (ftpEntries.length > 0) {
            const ftpValue = String(ftpEntries[0].value);
            setFtp(ftpValue);
            setFtpInput(ftpValue);
          }
        }

        if (statsData.weight) {
          const weightEntries = Object.entries(statsData.weight)
            .map(([date, value]) => ({ date, value }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          if (weightEntries.length > 0) {
            const weightValue = String(weightEntries[0].value);
            setWeight(weightValue);
            setWeightInput(weightValue);
          }
        }
      }
    };

    fetchFtp();
  }, [session?.user?.id]);

  useEffect(() => {
    const checkConnections = async () => {
      const hasStrava = await ensureValidStravaToken();
      const wahooToken = await ensureValidWahooToken();
      setStravaConnected(hasStrava);
      setWahooConnected(!!wahooToken);
    };
    checkConnections();
  }, []);

  useEffect(() => {
    const loadOpenaiApiKey = async () => {
      try {
        const key = await AsyncStorage.getItem('openai_api_key');
        if (key) {
          setOpenaiApiKey(key);
          setOpenaiApiKeyInput(key);
        }
      } catch (e) {
        console.error('Error loading OpenAI API key', e);
      }
    };
    loadOpenaiApiKey();
  }, []);

  const handleOpenaiApiKeyInputChange = (text: string) => {
    setOpenaiApiKeyInput(text);
    if (!openaiApiKeyIsDirty && text !== openaiApiKey) {
      setOpenaiApiKeyIsDirty(true);
    } else if (text === openaiApiKey) {
      setOpenaiApiKeyIsDirty(false);
    }
  };

  const handleSaveOpenaiApiKey = async () => {
    if (!openaiApiKeyIsDirty) return;
    try {
      const trimmed = openaiApiKeyInput.trim();
      await AsyncStorage.setItem('openai_api_key', trimmed);
      setOpenaiApiKey(trimmed);
      setOpenaiApiKeyIsDirty(false);
    } catch (e) {
      console.error('Error saving OpenAI API key', e);
    }
  };

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

  const handleWeightInputChange = (text: string) => {
    setWeightInput(text);
    if (!weightIsDirty && text !== weight) {
      setWeightIsDirty(true);
    }
  };

  const handleWeightInputBlur = () => {
    const trimmed = weightInput.trim();
    if (!trimmed) {
      setWeightInput(weight);
      setWeightIsDirty(false);
      return;
    }
    const value = parseFloat(trimmed);
    if (Number.isNaN(value) || value <= 0) {
      setWeightInput(weight);
      setWeightIsDirty(false);
      return;
    }

    const weightValue = String(value);
    setWeightInput(weightValue);

    if (weightValue !== weight) {
      setWeightIsDirty(true);
    } else {
      setWeightIsDirty(false);
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

      const existingData = (existing?.data as { ftp?: Record<string, number>; weight?: Record<string, number> }) || {};
      const existingFtp = existingData.ftp || {};
      const ftpData = {
        ...existingData,
        ftp: {
          [today]: value,
          ...existingFtp,
        },
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

  const handleSaveWeight = async () => {
    if (!session?.user?.id || !weightIsDirty) return;

    const value = parseFloat(weightInput);
    if (Number.isNaN(value) || value <= 0) return;

    setWeightIsSaving(true);

    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: existing } = await supabase
        .from('stats')
        .select('data')
        .eq('user_id', session.user.id)
        .single();

      const existingData = (existing?.data as { ftp?: Record<string, number>; weight?: Record<string, number> }) || {};
      const existingWeight = existingData.weight || {};
      const weightData = {
        ...existingData,
        weight: {
          [today]: value,
          ...existingWeight,
        },
      };

      if (existing) {
        await supabase
          .from('stats')
          .update({ data: weightData })
          .eq('user_id', session.user.id);
      } else {
        await supabase
          .from('stats')
          .insert({
            user_id: session.user.id,
            data: weightData,
          });
      }

      setWeight(String(value));
      setWeightIsDirty(false);
      setWeightIsSaving(false);
      setWeightShowSuccess(true);

      setTimeout(() => {
        setWeightShowSuccess(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to save weight:', error);
      setWeightIsSaving(false);
    }
  };

  const handleClose = () => {
    setFtpIsDirty(false);
    setFtpIsSaving(false);
    setFtpShowSuccess(false);
    setFtpInput(ftp);
    setWeightIsDirty(false);
    setWeightIsSaving(false);
    setWeightShowSuccess(false);
    setWeightInput(weight);
    setOpenaiApiKeyIsDirty(false);
    setOpenaiApiKeyInput(openaiApiKey);
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

  const handleWahooPress = async () => {
    if (wahooConnected) {
      await disconnectWahoo();
      setWahooConnected(false);
    } else {
      const ok = await connectWahoo();
      if (ok) {
        setWahooConnected(true);
      }
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const blurAllInputs = () => {
    ftpInputRef.current?.blur();
    weightInputRef.current?.blur();
    openaiApiKeyInputRef.current?.blur();
    Keyboard.dismiss();
  };

  if (!session) return null;

  const user = session.user;
  const profilePicUrl = user?.user_metadata?.avatar_url;
  const fullName = user?.user_metadata?.full_name || 'User';
  const email = user?.email;

  return (
    <View style={styles.container}>
      <View style={styles.modalHandle} />
      
      <View style={styles.header}>
        <Pressable onPress={handleClose} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.closeButton} />
      </View>

      <ScrollView 
        style={styles.content} 
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScrollBeginDrag={blurAllInputs}
      >
        <Pressable onPress={blurAllInputs} style={styles.profileSection}>
          {profilePicUrl ? (
            <Image source={{ uri: profilePicUrl }} style={styles.profileImage} />
          ) : (
            <View style={styles.profilePlaceholder} />
          )}
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.email}>{email}</Text>
        </Pressable>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stats</Text>
          <View style={styles.statsInputContainer}>
            <Text style={styles.ftpLabel}>FTP</Text>
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
                ref={ftpInputRef}
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
          <View style={[styles.statsInputContainer]}>
            <Text style={styles.ftpLabel}>Weight</Text>
            <View style={styles.ftpInputContainer}>
              {weightIsDirty && !weightIsSaving && !weightShowSuccess && (
                <Pressable onPress={handleSaveWeight} style={styles.ftpSaveButton}>
                  <Feather name="save" size={20} color="#3b82f6" />
                </Pressable>
              )}
              {weightIsSaving && (
                <View style={styles.ftpSaveButton}>
                  <ActivityIndicator size="small" color="#3b82f6" />
                </View>
              )}
              {weightShowSuccess && (
                <View style={styles.ftpSaveButton}>
                  <Feather name="check" size={20} color="#10b981" />
                </View>
              )}
              <TextInput
                ref={weightInputRef}
                style={[styles.ftpInput, weightInputFocused && styles.ftpInputFocused]}
                value={weightInput}
                onChangeText={handleWeightInputChange}
                onBlur={() => {
                  handleWeightInputBlur();
                  setWeightInputFocused(false);
                }}
                onFocus={() => setWeightInputFocused(true)}
                keyboardType="numeric"
                placeholder="--"
                placeholderTextColor="#6b7280"
              />
              <Text style={styles.ftpUnit}>kg</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Settings</Text>
          <View style={styles.statsInputContainer}>
            <Text style={styles.ftpLabel}>OpenAI API Key</Text>
            <View style={styles.ftpInputContainer}>
              {openaiApiKeyIsDirty && (
                <Pressable onPress={handleSaveOpenaiApiKey} style={styles.ftpSaveButton}>
                  <Feather name="save" size={20} color="#3b82f6" />
                </Pressable>
              )}
              <TextInput
                ref={openaiApiKeyInputRef}
                style={[styles.ftpInput, styles.openaiApiKeyInput, openaiApiKeyInputFocused && styles.ftpInputFocused]}
                value={openaiApiKeyInput}
                onChangeText={handleOpenaiApiKeyInputChange}
                onBlur={() => setOpenaiApiKeyInputFocused(false)}
                onFocus={() => setOpenaiApiKeyInputFocused(true)}
                placeholder="sk-..."
                placeholderTextColor="#6b7280"
                secureTextEntry
              />
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

          <Pressable
            style={[styles.serviceButton, styles.wahooButton]}
            onPress={handleWahooPress}
          >
            <Text style={styles.serviceButtonText}>
              {wahooConnected ? 'Disconnect from ' : 'Connect to '}
            </Text>
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
  statsInputContainer: {
    backgroundColor: '#1e293b',
    paddingVertical: 4,
    paddingHorizontal: 8,
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
  openaiApiKeyInput: {
    width: 160,
    textAlign: 'left',
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

