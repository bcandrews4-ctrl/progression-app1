/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { API_KEY, BACKEND_BASE_URL } from './src/config';
import { requestHealthAuthorization, syncHealthData } from './src/healthkit';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [status, setStatus] = React.useState('Ready to sync');
  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    setStatus('Requesting HealthKit permission...');
    try {
      const authorized = await requestHealthAuthorization();
      if (!authorized) {
        setStatus('HealthKit permission not granted.');
        setIsSyncing(false);
        return;
      }
      setStatus('Syncing workouts and metrics...');
      const result = await syncHealthData({
        baseURL: BACKEND_BASE_URL,
        apiKey: API_KEY,
        days: 30,
      });
      setStatus(`Uploaded ${result.workouts} workouts and ${result.metrics} daily metrics.`);
    } catch (error) {
      setStatus('Sync failed. Check Health permissions and backend.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gym Progression Sync</Text>
      <Text style={styles.subtitle}>Connect HealthKit to sync workouts and daily metrics.</Text>
      <TouchableOpacity style={[styles.button, isSyncing && styles.buttonDisabled]} onPress={handleSync} disabled={isSyncing}>
        <Text style={styles.buttonText}>{isSyncing ? 'Syncing...' : 'Connect & Sync'}</Text>
      </TouchableOpacity>
      <Text style={styles.status}>{status}</Text>
      <Text style={styles.note}>Update `src/config.ts` with your backend URL and API key.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  button: {
    backgroundColor: '#2E6BFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  status: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 12,
  },
  note: {
    textAlign: 'center',
    fontSize: 12,
    opacity: 0.6,
  },
});

export default App;
