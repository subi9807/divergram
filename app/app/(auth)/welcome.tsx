import React from 'react';
import { Image, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';

const heroImage = { uri: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1400&q=85' };
const brandLogo = require('../../assets/images/logo.png');

export default function WelcomeScreen() {
  const { t } = useTranslation();

  return (
    <Screen safe={false}>
      <ImageBackground source={heroImage} style={styles.hero} resizeMode="cover">
        <View style={styles.overlay} />
        <View style={styles.top}>
          <View style={styles.logo}>
            <Image source={brandLogo} style={styles.logoImage} resizeMode="contain" />
          </View>
          <Text style={styles.brand}>Divergram</Text>
        </View>

        <View style={styles.copy}>
          <View style={styles.badge}>
            <ShieldCheck size={15} color="#ffffff" />
            <Text style={styles.badgeText}>{t('welcome.badge')}</Text>
          </View>
          <Text style={styles.title}>{t('welcome.title')}</Text>
          <Text style={styles.subtitle}>{t('welcome.subtitle')}</Text>
        </View>

        <View style={styles.actions}>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.primaryText}>{t('welcome.getStarted')}</Text>
            </TouchableOpacity>
          </Link>
          <View style={styles.links}>
            <Link href="/(auth)/privacy" asChild>
              <Text style={styles.linkText}>{t('auth.privacy')}</Text>
            </Link>
            <Link href="/(auth)/terms" asChild>
              <Text style={styles.linkText}>{t('auth.terms')}</Text>
            </Link>
          </View>
        </View>
      </ImageBackground>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingBottom: 34,
    paddingTop: 64,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  top: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  logo: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  logoImage: {
    width: 28,
    height: 28,
  },
  brand: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    marginLeft: 12,
  },
  copy: {
    paddingBottom: 28,
  },
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  title: {
    color: '#ffffff',
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 46,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
  },
  actions: {
    gap: 18,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    height: 56,
    justifyContent: 'center',
  },
  primaryText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  linkText: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 13,
    fontWeight: '700',
    marginHorizontal: 12,
  },
});
