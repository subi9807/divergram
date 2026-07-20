import React from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as WebBrowser from 'expo-web-browser';
import { HandCoins, Heart, ShieldCheck } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { useResolvedTheme } from '../../src/hooks/useResolvedTheme';
import { getPaypalDonatePageUrl, getPaypalHostedButtonId } from '../../src/config/paypal';

export default function DonateScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isDark } = useResolvedTheme();
  const hostedButtonId = getPaypalHostedButtonId();
  const donatePageUrl = getPaypalDonatePageUrl();

  const colors = isDark
    ? {
        title: '#E2E8F0',
        subtitle: '#9FB3C8',
        cardBg: '#0F1B2A',
        cardBorder: '#243447',
        hint: '#9FB3C8',
      }
    : {
        title: '#0F172A',
        subtitle: '#64748B',
        cardBg: '#FFFFFF',
        cardBorder: '#D7E4F1',
        hint: '#70859A',
      };

  const handleOpenPaypal = async () => {
    if (!donatePageUrl) {
      Alert.alert(t('common.info', { defaultValue: '안내' }), 'PayPal 후원 링크가 아직 설정되지 않았습니다.');
      return;
    }
    await WebBrowser.openBrowserAsync(donatePageUrl, {
      dismissButtonStyle: 'close',
      readerMode: false,
      showTitle: true,
    });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 64 }}>
        <TouchableOpacity
          activeOpacity={0.86}
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            backgroundColor: colors.cardBg,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 20, color: colors.title }}>‹</Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 26, fontWeight: '800', color: colors.title }}>{t('settingsPage.donate.title', { defaultValue: t('settingsPage.app.donate', { defaultValue: '후원하기' }) })}</Text>
        <Text style={{ marginTop: 8, color: colors.subtitle, lineHeight: 20 }}>
          {t('settingsPage.donate.subtitle', { defaultValue: 'PayPal 공식 후원 버튼을 통해 Divergram을 응원할 수 있습니다.' })}
        </Text>

        <View style={{ marginTop: 18, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg, padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <HandCoins size={18} color={isDark ? '#7dd3fc' : '#0d5fa8'} />
            <Text style={{ marginLeft: 8, fontSize: 16, fontWeight: '800', color: colors.title }}>
              {t('settingsPage.donate.buttonLabel', { defaultValue: 'PayPal Hosted Button' })}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
            <ShieldCheck size={16} color={isDark ? '#94a3b8' : '#64748B'} />
            <Text style={{ marginLeft: 8, fontSize: 12, color: colors.hint }}>
              {t('settingsPage.donate.buttonHint', { defaultValue: 'PayPal hosted button ID: {{id}}', id: hostedButtonId })}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.86}
            onPress={handleOpenPaypal}
            style={{
              marginTop: 6,
              borderRadius: 16,
              backgroundColor: '#0D5FA8',
              paddingVertical: 15,
            }}
          >
            <Text style={{ textAlign: 'center', fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>
              {t('settingsPage.donate.buttonTitle', { defaultValue: 'PayPal 후원 페이지 열기' })}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg, padding: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.title }}>
            {t('settingsPage.donate.guideTitle', { defaultValue: '안내' })}
          </Text>
          <Text style={{ marginTop: 8, fontSize: 13, lineHeight: 20, color: colors.subtitle }}>
            {t('settingsPage.donate.guideBody', { defaultValue: '후원 금액과 옵션은 PayPal Hosted Button 설정에서 관리합니다.' })}
          </Text>
          <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center' }}>
            <Heart size={15} color="#ef4444" />
            <Text style={{ marginLeft: 6, fontSize: 12, color: colors.hint }}>
              {t('settingsPage.donate.thanks', { defaultValue: 'Divergram을 응원해주셔서 감사합니다.' })}
            </Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
