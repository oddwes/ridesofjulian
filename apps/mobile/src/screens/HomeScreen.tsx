import { Modal, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Header } from '../components/Header';
import { ProfileScreen } from './ProfileScreen';
import { Calendar } from '../components/calendar/Calendar';

export function HomeScreen() {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Header onProfilePress={() => setShowProfile(true)} />
      
      <Calendar />

      <Modal
        visible={showProfile}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProfile(false)}
      >
        <ProfileScreen onClose={() => setShowProfile(false)} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e293b',
  },
});

