import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ImageBackground, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ShieldCheck } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { requestCoreRuntimePermissionsOnce } from '../../src/lib/runtimePermissions';
import { markTutorialCompleted } from '../../src/lib/tutorial';

const heroImage = {
  uri: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1400&q=85',
};

export default function TutorialScreen() {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [requesting, setRequesting] = useState(false);

  const steps = useMemo(
    () => [
      {
        title: t('tutorial.steps.one.title', { defaultValue: 'Divergram에 오신 것을 환영합니다' }),
        body: t('tutorial.steps.one.body', { defaultValue: '피드, 지도, 로그북으로 다이빙 경험을 한곳에서 기록하세요.' }),
      },
      {
        title: t('tutorial.steps.two.title', { defaultValue: '나만의 다이빙 로그를 남기세요' }),
        body: t('tutorial.steps.two.body', { defaultValue: '수심, 수온, 포인트, 버디 정보를 사진과 함께 정리할 수 있습니다.' }),
      },
      {
        title: t('tutorial.steps.three.title', { defaultValue: '권한 설정을 마치면 바로 시작됩니다' }),
        body: t('tutorial.steps.three.body', { defaultValue: '알림, 위치, 블루투스 권한을 허용하면 핵심 기능을 모두 사용할 수 있습니다.' }),
      },
    ],
    [t]
  );

  const isLast = step === steps.length - 1;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (requesting) return;
      if (isLast) {
        void completeWithPermissions();
        return;
      }
      setStep((prev) => Math.min(prev + 1, steps.length - 1));
    }, 4500);

    return () => clearTimeout(timer);
  }, [completeWithPermissions, isLast, requesting, steps.length, step]);

  const completeTutorial = useCallback(async () => {
    await markTutorialCompleted();
    router.replace('/');
  }, []);

  const completeWithPermissions = useCallback(async () => {
    setRequesting(true);
    try {
      await completeTutorial();
      void requestCoreRuntimePermissionsOnce({ force: true }).catch(() => undefined);
    } finally {
      setRequesting(false);
    }
  }, [completeTutorial]);

  const handleNext = useCallback(async () => {
    if (!isLast) {
      setStep((prev) => prev + 1);
      return;
    }

    await completeWithPermissions();
  }, [completeWithPermissions, isLast]);

  return (
    <Screen safe={false}>
      <ImageBackground source={heroImage} style={styles.hero} resizeMode="cover">
        <View pointerEvents="none" style={styles.overlay} />
        <View style={styles.inner}>
          <View style={styles.badge}>
            <ShieldCheck size={15} color="#ffffff" />
            <Text style={styles.badgeText}>Divergram Tutorial</Text>
          </View>

          <View style={styles.copyWrap}>
            <Text style={styles.stepLabel}>
              {t('tutorial.stepLabel', { defaultValue: 'Step {{current}} / {{total}}', current: step + 1, total: steps.length })}
            </Text>
            <Text style={styles.title}>{steps[step].title}</Text>
            <Text style={styles.body}>{steps[step].body}</Text>
          </View>

          <View style={styles.dotRow}>
            {steps.map((_, idx) => (
              <View key={`dot-${idx}`} style={[styles.dot, idx === step ? styles.dotActive : undefined]} />
            ))}
          </View>

          <View pointerEvents="box-none" style={styles.actionRow}>
            <View style={styles.skipRow}>
              <Pressable
                hitSlop={12}
                onPress={completeWithPermissions}
                style={({ pressed }) => [styles.skipButton, pressed ? styles.pressed : undefined]}
                disabled={requesting}
              >
                <Text style={styles.skipText}>{t('tutorial.skip', { defaultValue: '건너뛰기' })}</Text>
              </Pressable>
            </View>
            <Pressable
              hitSlop={12}
              onPress={handleNext}
              style={({ pressed }) => [styles.nextButton, pressed ? styles.pressed : undefined]}
              disabled={requesting}
            >
              {requesting ? (
                <ActivityIndicator color="#111827" />
              ) : (
                <View style={styles.nextContent}>
                  <Text style={styles.nextText}>
                    {isLast ? t('tutorial.start', { defaultValue: '권한 허용 후 시작' }) : t('common.next', { defaultValue: '다음' })}
                  </Text>
                  <ChevronRight size={16} color="#111827" />
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </ImageBackground>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(3,10,20,0.58)',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 70,
    paddingBottom: 96,
    justifyContent: 'space-between',
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeText: {
    marginLeft: 6,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  copyWrap: {
    marginTop: 20,
  },
  stepLabel: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  title: {
    color: '#ffffff',
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '800',
  },
  body: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.88)',
    fontSize: 15,
    lineHeight: 23,
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.34)',
    marginRight: 7,
  },
  dotActive: {
    width: 26,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  actionRow: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 148,
    flexDirection: 'column',
    gap: 10,
  },
  skipRow: {
    alignItems: 'flex-end',
  },
  skipButton: {
    minWidth: 88,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  nextButton: {
    width: '100%',
    height: 58,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: Platform.OS === 'ios' ? 0.78 : 0.85,
  },
  nextContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
    marginRight: 5,
  },
});
