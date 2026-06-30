import React, { useRef, useState } from 'react';
import {
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Apple,
  ArrowLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Facebook,
  Mail,
  ShieldCheck,
  UserRound,
} from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { LoadingOverlay } from '../../src/components/LoadingOverlay';
import { useAuth } from '../../src/hooks/useAuth';
import type { SocialLinkInput, SocialSignupInput } from '../../src/providers/AuthProvider';
import { setPendingSignupDraft } from '../../src/services/signupFlowService';

type Provider = 'google' | 'apple' | 'facebook' | 'kakao' | 'naver' | 'instagram';
type FocusedField = 'name' | 'contact' | 'email' | 'password' | null;
type EmailAuthMode = 'signin' | 'signup';

const heroImage = {
  uri: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1400&q=85',
};
const brandLogo = require('../../assets/images/logo.png');

export default function LoginScreen() {
  const { t } = useTranslation();
  const {
    loginWithGoogle,
    loginWithApple,
    loginWithFacebook,
    loginWithKakao,
    loginWithNaver,
    loginWithInstagram,
    loginWithEmail,
    signupWithSocialAccount,
    linkSocialAccount,
  } = useAuth();
  const nameRef = useRef<TextInput>(null);
  const contactRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailAuthMode, setEmailAuthMode] = useState<EmailAuthMode>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<FocusedField>(null);
  const [pendingSocialLink, setPendingSocialLink] = useState<SocialLinkInput | null>(null);
  const isSigninDisabled = !email.trim() || !password;
  const isSignupDisabled = !name.trim() || !contact.trim() || !email.trim() || !password;

  const resolveErrorMessage = (error: unknown, mode: EmailAuthMode | 'social' = 'social') => {
    const status = (error as any)?.response?.status;
    const raw = String((error as any)?.message || '');
    const rawLower = raw.toLowerCase();
    if (rawLower.includes('urlstring') || rawLower.includes('invalid url')) return t('auth.oauthConfigInvalid');
    if (raw.includes('google_requires_dev_build')) return t('auth.googleRequiresDevBuild');
    if (raw.includes('apple_requires_ios')) return 'Apple 로그인은 iOS 기기에서만 사용할 수 있습니다.';
    if (raw.includes('apple_login_unavailable')) return '현재 기기에서 Apple 로그인을 사용할 수 없습니다.';
    if (raw.includes('apple_identity_token_missing')) return 'Apple 인증 토큰을 확인할 수 없습니다.';
    if (raw.includes('missing_google_client_id')) return t('auth.googleConfigMissing');
    if (raw.includes('invalid_auth_url') || raw.includes('invalid_return_url') || raw.includes('kakao_config_missing') || raw.includes('naver_config_missing') || raw.includes('instagram_config_missing')) return t('auth.oauthConfigInvalid');
    if (raw.includes('google_profile_missing_fields')) return t('auth.googleProfileMissing');
    if (raw.includes('oauth_backend_not_available')) return t('auth.oauthBackendMissing');
    if (raw.includes('google_userinfo_failed')) return t('auth.googleUserInfoFailed');
    if (raw.includes('sso_signup_required')) return t('auth.socialSignupFailed');
    if (raw.includes('sso_email_exists')) return t('auth.socialEmailExists');
    if (raw.includes('sso_linked_email_login_required')) return t('auth.socialLinkedEmailLoginRequired');
    if (raw.includes('instagram_cancelled')) return 'Instagram 로그인이 취소되었습니다.';
    if (raw.includes('instagram_token_exchange_failed')) return t('auth.socialLinkFailed');
    if (raw.includes('instagram_userinfo_failed')) return t('auth.socialLinkFailed');
    if (
      raw.includes('oauth_email_mismatch') ||
      raw.includes('oauth_link_failed') ||
      raw.includes('oauth_link_confirm_failed') ||
      raw.includes('oauth_already_linked') ||
      raw.includes('oauth_link_email_not_found') ||
      raw.includes('invalid_or_expired_link_token') ||
      raw.includes('missing_link_token')
    ) return t('auth.socialLinkFailed');
    if (raw.includes('email_already_exists') || status === 409) return t('auth.emailAlreadyExists');
    if (raw.includes('password_too_short')) return t('auth.passwordTooShort');
    return mode === 'signup' ? t('auth.signupFailed') : t('auth.loginFailed');
  };

  const getProviderDisplayName = (provider: Provider) => {
    switch (provider) {
      case 'google':
        return 'Google';
      case 'apple':
        return 'Apple';
      case 'facebook':
        return 'Facebook';
      case 'kakao':
        return 'Kakao';
      case 'naver':
        return 'Naver';
      case 'instagram':
        return 'Instagram';
      default:
        return provider;
    }
  };

  const openEmailLinkFlow = (socialLink: SocialLinkInput) => {
    setPendingSocialLink(socialLink);
    setShowEmailForm(true);
    setEmailAuthMode('signin');
    setEmail(socialLink.email);
    setPassword('');
    setShowPassword(false);
  };

  const completeSocialLink = async (socialLink: SocialLinkInput, options?: { silent?: boolean }) => {
    await linkSocialAccount(socialLink);
    if (!options?.silent) {
      Alert.alert(
        t('auth.ssoLinkedTitle'),
        t('auth.ssoLinkedMessage', {
          provider: getProviderDisplayName(socialLink.provider as Provider),
        })
      );
    }
    setPendingSocialLink(null);
  };

  const completeSocialSignup = async (socialSignup: SocialSignupInput) => {
    await signupWithSocialAccount(socialSignup);
    Alert.alert(
      t('auth.socialSignupCompleteTitle'),
      t('auth.socialSignupCompleteMessage')
    );
  };

  const handleSocialLogin = async (provider: Provider) => {
    setLoading(true);
    try {
      switch (provider) {
        case 'google':
          await loginWithGoogle();
          break;
        case 'apple':
          await loginWithApple();
          break;
        case 'facebook':
          await loginWithFacebook();
          break;
        case 'kakao':
          await loginWithKakao();
          break;
        case 'naver':
          await loginWithNaver();
          break;
        case 'instagram':
          await loginWithInstagram();
          break;
      }
      router.replace('/(tabs)/feed');
    } catch (error) {
      const socialLink = (error as any)?.socialLink as SocialLinkInput | undefined;
      const socialSignup = (error as any)?.socialSignup as SocialSignupInput | undefined;
      const code = String((error as any)?.code || (error as any)?.message || '');
      if (code.includes('ERR_REQUEST_CANCELED')) {
        return;
      }
      if (code.includes('google_login_cancelled')) {
        return;
      }
      if (socialSignup && code.includes('sso_signup_required')) {
        Alert.alert(
          t('auth.socialSignupRequiredTitle'),
          t('auth.socialSignupRequiredPrompt', {
            provider: getProviderDisplayName(socialSignup.provider as Provider),
          }),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('auth.signUp'),
              onPress: async () => {
                setLoading(true);
                try {
                  await completeSocialSignup(socialSignup);
                  router.replace('/(tabs)/feed');
                } catch (signupError) {
                  Alert.alert(t('auth.error'), resolveErrorMessage(signupError, 'signup'));
                } finally {
                  setLoading(false);
                }
              },
            },
          ]
        );
        return;
      }
      if (socialLink && code.includes('sso_email_exists')) {
        if (provider === 'apple') {
          try {
            await completeSocialLink(socialLink, { silent: true });
            router.replace('/(tabs)/feed');
          } catch (linkError) {
            Alert.alert(t('auth.error'), resolveErrorMessage(linkError, 'social'));
          }
          return;
        }
        Alert.alert(
          t('auth.error'),
          t('auth.socialEmailExistsPrompt', { email: socialLink.email }),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('auth.linkNow'),
              onPress: async () => {
                setLoading(true);
                try {
                  await completeSocialLink(socialLink);
                  router.replace('/(tabs)/feed');
                  return;
                } catch {
                  // fall back to explicit email login flow if direct confirm fails
                } finally {
                  setLoading(false);
                }
                openEmailLinkFlow(socialLink);
              },
            },
          ]
        );
        return;
      }
      if (socialLink && code.includes('sso_linked_email_login_required')) {
        Alert.alert(
          t('auth.error'),
          t('auth.socialLinkedEmailLoginRequired'),
          [
            {
              text: t('common.done'),
              onPress: () => openEmailLinkFlow(socialLink),
            },
          ]
        );
        return;
      }
      Alert.alert(t('auth.error'), resolveErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      Alert.alert(t('auth.error'), t('auth.fillAllFields'));
      return;
    }

    setLoading(true);
    try {
      await loginWithEmail(normalizedEmail, password);
      if (pendingSocialLink) {
        try {
          await completeSocialLink(pendingSocialLink);
        } catch (linkError) {
          Alert.alert(t('auth.error'), resolveErrorMessage(linkError, 'social'));
          router.replace('/(tabs)/feed');
          return;
        }
      }
      router.replace('/(tabs)/feed');
    } catch (error) {
      Alert.alert(t('auth.error'), resolveErrorMessage(error, 'signin'));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignup = async () => {
    const normalizedName = name.trim();
    const normalizedContact = contact.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedName || !normalizedContact || !normalizedEmail || !password) {
      Alert.alert(t('auth.error'), t('auth.fillAllFields'));
      return;
    }
    if (password.length < 8) {
      Alert.alert(t('auth.error'), t('auth.passwordTooShort'));
      return;
    }

    setPendingSignupDraft({
      email: normalizedEmail,
      password,
      name: normalizedName,
      contact: normalizedContact,
    });
    router.push('/(auth)/consent');
  };

  return (
    <Screen safe={false} tone="plain">
      <LoadingOverlay visible={loading} text={t('auth.processing')} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ImageBackground source={heroImage} style={styles.hero} imageStyle={styles.heroImage}>
              <View pointerEvents="none" style={styles.heroOverlay} />

            <View style={styles.heroTopRow}>
              <TouchableOpacity
                onPress={() => router.back()}
                activeOpacity={0.86}
                accessibilityRole="button"
                style={styles.backButton}
              >
                <ArrowLeft size={19} color="#ffffff" />
              </TouchableOpacity>

              <View style={styles.brandRow}>
                <View style={styles.logoBadge}>
                  <Image source={brandLogo} style={styles.logoImage} resizeMode="contain" />
                </View>
                <Text style={styles.brandText}>Divergram</Text>
              </View>
            </View>

            <View style={styles.heroCopy}>
              <View style={styles.safeBadge}>
                <ShieldCheck size={14} color="#ffffff" />
                <Text style={styles.safeBadgeText}>{t('welcome.badge')}</Text>
              </View>
              <Text style={styles.heroTitle}>{t('auth.welcome')}</Text>
              <Text style={styles.heroSubtitle}>{t('auth.loginSubtitle')}</Text>
            </View>
          </ImageBackground>

          <View style={styles.formCard}>
            {!showEmailForm ? (
              <>
                <SocialLoginButton
                  label={t('auth.continueWithGoogle')}
                  onPress={() => handleSocialLogin('google')}
                  icon="G"
                  disabled={loading}
                />
                <SocialLoginButton
                  label={t('auth.continueWithApple')}
                  onPress={() => handleSocialLogin('apple')}
                  icon={<Apple size={18} color="#0f172a" />}
                  disabled={loading}
                  containerStyle={styles.spacingMd}
                />
                <SocialLoginButton
                  label={t('auth.continueWithFacebook')}
                  onPress={() => handleSocialLogin('facebook')}
                  icon={<Facebook size={18} color="#1877f2" />}
                  disabled={loading}
                  containerStyle={styles.spacingMd}
                />
                <SocialLoginButton
                  label={t('auth.continueWithKakao', { defaultValue: 'Kakao로 계속하기' })}
                  onPress={() => handleSocialLogin('kakao')}
                  icon={<Text style={styles.kakaoIconText}>K</Text>}
                  disabled={loading}
                  containerStyle={[styles.spacingMd, styles.kakaoButton]}
                  iconWrapStyle={styles.kakaoIconWrap}
                />
                <SocialLoginButton
                  label={t('auth.continueWithNaver')}
                  onPress={() => handleSocialLogin('naver')}
                  icon={<UserRound size={18} color="#ffffff" />}
                  disabled={loading}
                  containerStyle={[styles.spacingMd, styles.naverButton]}
                  iconWrapStyle={styles.naverIconWrap}
                  labelStyle={styles.naverLabel}
                  chevronColor="#ffffff"
                />
                <SocialLoginButton
                  label={t('auth.continueWithInstagram', { defaultValue: 'Instagram으로 계속하기' })}
                  onPress={() => handleSocialLogin('instagram')}
                  icon={<Text style={styles.instagramIconText}>◎</Text>}
                  disabled={loading}
                  containerStyle={[styles.spacingMd, styles.instagramButton]}
                  iconWrapStyle={styles.instagramIconWrap}
                  labelStyle={styles.instagramLabel}
                  chevronColor="#ffffff"
                />

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>{t('auth.or')}</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setShowEmailForm(true);
                    setEmailAuthMode('signin');
                    setPendingSocialLink(null);
                  }}
                  activeOpacity={0.86}
                  disabled={loading}
                  style={styles.emailSwitchButton}
                >
                  <View style={styles.emailIconWrap}>
                    <Mail size={18} color="#0d5fa8" />
                  </View>
                  <Text style={styles.emailSwitchLabel}>{t('auth.continueWithEmail')}</Text>
                  <ChevronRight size={18} color="#64748b" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.modeSwitchWrap}>
                  <TouchableOpacity
                    onPress={() => setEmailAuthMode('signin')}
                    activeOpacity={0.88}
                    style={[styles.modeSwitchButton, emailAuthMode === 'signin' && styles.modeSwitchButtonActive]}
                  >
                    <Text style={[styles.modeSwitchText, emailAuthMode === 'signin' && styles.modeSwitchTextActive]}>{t('auth.signIn')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setEmailAuthMode('signup')}
                    activeOpacity={0.88}
                    style={[styles.modeSwitchButton, emailAuthMode === 'signup' && styles.modeSwitchButtonActive]}
                  >
                    <Text style={[styles.modeSwitchText, emailAuthMode === 'signup' && styles.modeSwitchTextActive]}>{t('auth.signUp')}</Text>
                  </TouchableOpacity>
                </View>

                {pendingSocialLink ? (
                  <View style={styles.linkNoticeWrap}>
                    <Text style={styles.linkNoticeText}>
                      {t('auth.socialLinkPendingNotice', {
                        provider: getProviderDisplayName(pendingSocialLink.provider as Provider),
                        email: pendingSocialLink.email,
                      })}
                    </Text>
                  </View>
                ) : null}

                {emailAuthMode === 'signup' ? (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{t('auth.name')}</Text>
                      <Pressable
                        style={[styles.inputWrap, focusedField === 'name' && styles.inputWrapFocused]}
                        onPress={() => nameRef.current?.focus()}
                      >
                        <TextInput
                          ref={nameRef}
                          value={name}
                          onChangeText={setName}
                          placeholder={t('auth.namePlaceholder')}
                          autoCapitalize="words"
                          autoCorrect={false}
                          placeholderTextColor="#93a2b3"
                          style={styles.input}
                          onFocus={() => setFocusedField('name')}
                          onBlur={() => setFocusedField(null)}
                          returnKeyType="next"
                          onSubmitEditing={() => contactRef.current?.focus()}
                        />
                      </Pressable>
                    </View>

                    <View style={[styles.inputGroup, styles.inputGroupSpaced]}>
                      <Text style={styles.inputLabel}>{t('auth.contact')}</Text>
                      <Pressable
                        style={[styles.inputWrap, focusedField === 'contact' && styles.inputWrapFocused]}
                        onPress={() => contactRef.current?.focus()}
                      >
                        <TextInput
                          ref={contactRef}
                          value={contact}
                          onChangeText={setContact}
                          placeholder={t('auth.contactPlaceholder')}
                          keyboardType="phone-pad"
                          autoCapitalize="none"
                          autoCorrect={false}
                          placeholderTextColor="#93a2b3"
                          style={styles.input}
                          onFocus={() => setFocusedField('contact')}
                          onBlur={() => setFocusedField(null)}
                          returnKeyType="next"
                          onSubmitEditing={() => emailRef.current?.focus()}
                        />
                      </Pressable>
                    </View>
                  </>
                ) : null}

                <View style={[styles.inputGroup, emailAuthMode === 'signup' ? styles.inputGroupSpaced : styles.inputGroupTop]}>
                  <Text style={styles.inputLabel}>{t('auth.email')}</Text>
                  <Pressable
                    style={[styles.inputWrap, focusedField === 'email' && styles.inputWrapFocused]}
                    onPress={() => emailRef.current?.focus()}
                  >
                    <TextInput
                      ref={emailRef}
                      value={email}
                      onChangeText={setEmail}
                      placeholder={t('auth.emailPlaceholder')}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      textContentType="emailAddress"
                      placeholderTextColor="#93a2b3"
                      style={styles.input}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      returnKeyType="next"
                      onSubmitEditing={() => passwordRef.current?.focus()}
                    />
                  </Pressable>
                </View>

                <View style={[styles.inputGroup, styles.inputGroupSpaced]}>
                  <Text style={styles.inputLabel}>{t('auth.password')}</Text>
                  <Pressable
                    style={[styles.inputWrap, focusedField === 'password' && styles.inputWrapFocused]}
                    onPress={() => passwordRef.current?.focus()}
                  >
                    <TextInput
                      ref={passwordRef}
                      value={password}
                      onChangeText={setPassword}
                      placeholder={t('auth.passwordPlaceholder')}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="password"
                      textContentType="password"
                      placeholderTextColor="#93a2b3"
                      style={styles.input}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      returnKeyType="done"
                      onSubmitEditing={emailAuthMode === 'signup' ? handleEmailSignup : handleEmailLogin}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword((prev) => !prev)}
                      activeOpacity={0.8}
                      style={styles.passwordToggle}
                      accessibilityRole="button"
                    >
                      {showPassword ? <EyeOff size={18} color="#64748b" /> : <Eye size={18} color="#64748b" />}
                    </TouchableOpacity>
                  </Pressable>
                </View>

                <TouchableOpacity
                  onPress={emailAuthMode === 'signup' ? handleEmailSignup : handleEmailLogin}
                  disabled={loading || (emailAuthMode === 'signup' ? isSignupDisabled : isSigninDisabled)}
                  activeOpacity={0.9}
                  style={[styles.signInButton, (loading || (emailAuthMode === 'signup' ? isSignupDisabled : isSigninDisabled)) && styles.disabledButton]}
                >
                  <Text style={styles.signInText}>{emailAuthMode === 'signup' ? t('auth.signUp') : t('auth.signIn')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setEmailAuthMode((prev) => (prev === 'signin' ? 'signup' : 'signin'))}
                  activeOpacity={0.86}
                  disabled={loading}
                  style={styles.modeHintButton}
                >
                  <Text style={styles.modeHintText}>
                    {emailAuthMode === 'signin' ? t('auth.noAccount') : t('auth.hasAccount')}
                    <Text style={styles.modeHintAccent}> {emailAuthMode === 'signin' ? t('auth.signUp') : t('auth.signIn')}</Text>
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setShowEmailForm(false);
                    setPendingSocialLink(null);
                  }}
                  activeOpacity={0.86}
                  disabled={loading}
                  style={styles.backToSocialButton}
                >
                  <Text style={styles.backToSocialText}>{t('auth.backToSocial')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.legalRow}>
            <Link href="/(auth)/privacy" asChild>
              <Pressable>
                <Text style={styles.legalLink}>{t('auth.privacy')}</Text>
              </Pressable>
            </Link>
            <View style={styles.legalDot} />
            <Link href="/(auth)/terms" asChild>
              <Pressable>
                <Text style={styles.legalLink}>{t('auth.terms')}</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function SocialLoginButton({
  label,
  onPress,
  icon,
  disabled,
  containerStyle,
  iconWrapStyle,
  labelStyle,
  chevronColor = '#64748b',
}: {
  label: string;
  onPress: () => void;
  icon: React.ReactNode;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  iconWrapStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  chevronColor?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      disabled={disabled}
      style={[styles.socialButton, containerStyle, disabled && styles.disabledButton]}
    >
      <View style={[styles.socialIconWrap, iconWrapStyle]}>
        {typeof icon === 'string' ? <Text style={styles.googleText}>{icon}</Text> : icon}
      </View>
      <Text style={[styles.socialLabel, labelStyle]} numberOfLines={1}>
        {label}
      </Text>
      <ChevronRight size={18} color={chevronColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 28,
  },
  hero: {
    marginHorizontal: 16,
    marginTop: 56,
    borderRadius: 28,
    minHeight: 272,
    overflow: 'hidden',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  heroImage: {
    borderRadius: 28,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7, 20, 36, 0.56)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  logoBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 16,
    height: 16,
  },
  brandText: {
    marginLeft: 8,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  heroCopy: {
    gap: 8,
    paddingBottom: 4,
  },
  safeBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  safeBadgeText: {
    marginLeft: 6,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 15,
    lineHeight: 22,
  },
  formCard: {
    marginTop: -16,
    marginHorizontal: 16,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 6,
  },
  socialButton: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbe4ee',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  spacingMd: {
    marginTop: 10,
  },
  socialIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#dbe4ee',
    backgroundColor: '#f8fbff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  socialLabel: {
    flex: 1,
    marginLeft: 10,
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  kakaoButton: {
    borderColor: '#f2d84f',
    backgroundColor: '#fee500',
  },
  kakaoIconWrap: {
    borderColor: 'rgba(120,53,15,0.22)',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  kakaoIconText: {
    color: '#191919',
    fontSize: 15,
    fontWeight: '800',
  },
  naverButton: {
    borderColor: '#00b63c',
    backgroundColor: '#00c73c',
  },
  naverIconWrap: {
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  naverLabel: {
    color: '#ffffff',
  },
  instagramButton: {
    borderColor: '#d946ef',
    backgroundColor: '#18181b',
  },
  instagramIconWrap: {
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  instagramIconText: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: '900',
  },
  instagramLabel: {
    color: '#ffffff',
  },
  dividerRow: {
    marginVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  emailSwitchButton: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbe4ee',
    backgroundColor: '#f8fbff',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emailIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#eaf6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailSwitchLabel: {
    flex: 1,
    marginLeft: 10,
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  modeSwitchWrap: {
    marginBottom: 14,
    padding: 4,
    borderRadius: 14,
    backgroundColor: '#f2f7fc',
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeSwitchButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSwitchButtonActive: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ee',
  },
  modeSwitchText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '700',
  },
  modeSwitchTextActive: {
    color: '#0f172a',
  },
  linkNoticeWrap: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  linkNoticeText: {
    color: '#0c4a6e',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  inputGroup: {
    gap: 8,
  },
  inputGroupTop: {
    marginTop: 6,
  },
  inputGroupSpaced: {
    marginTop: 14,
  },
  inputLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 2,
  },
  inputWrap: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe4ee',
    backgroundColor: '#f8fbff',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWrapFocused: {
    borderColor: '#1198f5',
    backgroundColor: '#ffffff',
    shadowColor: '#1198f5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
  },
  input: {
    flex: 1,
    color: '#0f172a',
    fontSize: 15,
    paddingVertical: 0,
  },
  passwordToggle: {
    marginLeft: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButton: {
    marginTop: 18,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: '#0a79d4',
    borderWidth: 1,
    borderColor: '#0a79d4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0a79d4',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
  },
  signInText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  backToSocialButton: {
    marginTop: 12,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fbff',
  },
  modeHintButton: {
    marginTop: 10,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeHintText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  modeHintAccent: {
    color: '#0a79d4',
    fontWeight: '800',
  },
  backToSocialText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
  legalRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legalLink: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  legalDot: {
    marginHorizontal: 8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
