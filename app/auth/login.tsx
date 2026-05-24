/**
 * @file login.tsx
 * @description Login screen for the Ronda app. Card image logo, email/password authentication, guest mode, and demo credentials.
 * @author Idriss Kriouile
 * @date 2026-04-05
 * @project SallyCards - Ronda
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as api from '../../shared/api';
import { useGoogleSignIn } from '../../shared/googleAuth';
import { APP_CONFIG } from '../../src/config/app.config';

const APP_COLOR = APP_CONFIG.primary;
const APP_NAME = APP_CONFIG.name;
const CARD_IMAGE = require('../../assets/cards/1E.png');

export default function LoginScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('demo@sallycards.com');
  const [password, setPassword] = useState('Demo123456');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('[Ronda/Login] Component mounted');
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      console.log('[Ronda/Login] Validation failed: empty fields');
      Alert.alert(t('error'), t('fillAllFields'));
      return;
    }
    setLoading(true);
    try {
      console.log('[Ronda/Login] Fetching login...');
      await api.login(email, password, { gameType: 'ronda' });
      console.log('[Ronda/Login] Login successful');
      router.replace('/(tabs)');
    } catch (e: any) {
      console.error('[Ronda/Login] Error:', e);
      Alert.alert(t('error'), e.message || t('loginError'));
    } finally {
      setLoading(false);
    }
  };

  const { promptAsync, ready: googleReady, missingClientId, missingNative } = useGoogleSignIn(
    async (idToken: string) => {
      setLoading(true);
      try {
        console.log('[Ronda/Login] Google id_token reçu → /auth/google');
        await api.loginWithGoogle(idToken, { gameType: 'ronda' });
        console.log('[Ronda/Login] Google login successful');
        router.replace('/(tabs)');
      } catch (e: any) {
        console.error('[Ronda/Login] Google error:', e);
        Alert.alert(t('error'), e.message || 'Google sign-in failed');
      } finally {
        setLoading(false);
      }
    },
    (msg: string) => {
      console.warn('[Ronda/Login] Google:', msg);
      setLoading(false);
    }
  );

  const handleGoogle = async () => {
    if (missingClientId) {
      Alert.alert(
        'Configuration Google',
        "EXPO_PUBLIC_GOOGLE_CLIENT_ID n'est pas défini. Renseignez le Client ID OAuth Google pour activer la connexion Google."
      );
      return;
    }
    if (missingNative) {
      Alert.alert(
        'Dev build requis',
        "La connexion Google necessite un dev build : lancez `npx expo run:android` depuis le dossier de l'app, ce qui installe le module natif Google. Expo Go ne le supporte pas."
      );
      return;
    }
    setLoading(true);
    try {
      await promptAsync();
    } catch (e: any) {
      setLoading(false);
      Alert.alert(t('error'), e?.message || 'Google sign-in failed');
    }
  };

  const handleGuest = async () => {
    setLoading(true);
    try {
      console.log('[Ronda/Login] Fetching guest session...');
      await api.createGuestSession();
      console.log('[Ronda/Login] Guest session created');
      router.replace('/(tabs)');
    } catch (e: any) {
      console.error('[Ronda/Login] Error:', e);
      Alert.alert(t('error'), e.message || t('guestError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {/* Card image logo */}
        <Image source={CARD_IMAGE} style={s.cardImage} resizeMode="contain" />

        {/* App title */}
        <View style={s.titleRow}>
          <Text style={s.sallyText}>Sally</Text>
          <Text style={[s.appNameText, { color: APP_COLOR }]}>{APP_NAME}</Text>
        </View>
        <Text style={s.subtitle}>{t('loginSubtitle')}</Text>

        {/* Login form */}
        <View style={s.form}>
          <Text style={s.label}>{t('email')}</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="demo@sallycards.com"
            placeholderTextColor="#6B7280"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={s.label}>{t('password')}</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            placeholder="********"
            placeholderTextColor="#6B7280"
            secureTextEntry
          />

          <TouchableOpacity style={s.button} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.buttonText}>{t('loginButton')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={s.googleButton}
            onPress={handleGoogle}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Image
              source={require('../../assets/google-g.png')}
              style={s.googleLogo}
              resizeMode="contain"
            />
            <Text style={s.googleText}>
              {missingNative
                ? 'Google (dev build requis)'
                : 'Continuer avec Google'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.guestButton} onPress={handleGuest} disabled={loading}>
            <Text style={s.guestText}>{t('guest')}</Text>
          </TouchableOpacity>
        </View>

        {/* Demo credentials box */}
        <View style={s.credentials}>
          <Text style={s.credTitle}>{t('demoAccount')}</Text>
          <Text style={s.credText}>Email: demo@sallycards.com</Text>
          <Text style={s.credText}>Pass: Demo123456</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a0808' },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  cardImage: { width: 80, height: 120, alignSelf: 'center', marginBottom: 16 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  sallyText: { fontSize: 28, fontWeight: '900', color: '#fff' },
  appNameText: { fontSize: 28, fontWeight: '900' },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  form: { gap: 12 },
  label: { color: '#9CA3AF', fontSize: 13, fontWeight: '600', marginBottom: -4 },
  input: {
    backgroundColor: '#152A47',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  button: {
    backgroundColor: APP_COLOR,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  guestButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  guestText: { color: '#9CA3AF', fontSize: 14, fontWeight: '600' },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  googleLogo: { width: 22, height: 22 },
  googleText: { color: '#1F2937', fontSize: 15, fontWeight: '700' },
  credentials: {
    marginTop: 32,
    padding: 16,
    backgroundColor: 'rgba(220,38,38,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.2)',
  },
  credTitle: { color: APP_COLOR, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  credText: { color: '#6B7280', fontSize: 12 },
});

/* === End of login.tsx -- Ronda -- SallyCards === */
