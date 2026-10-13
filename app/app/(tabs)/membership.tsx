import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { useRouter } from 'expo-router';
import { ErrorCode, getAvailablePurchases, type Purchase, useIAP } from 'expo-iap';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, Mail, Phone, RefreshCw, Sparkles, UserRound } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { apiClient } from '../../src/lib/api';
import { useAuth } from '../../src/hooks/useAuth';
import { useProfile } from '../../src/hooks/useProfile';
import { useResolvedTheme } from '../../src/hooks/useResolvedTheme';
import { storeSubscriptionsAvailable } from '../../src/config/paymentAvailability';

export default function MembershipScreen() {
  return <PaidMembershipScreen />;
}

function PaidMembershipScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isDark } = useResolvedTheme();
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const [processing, setProcessing] = useState(false);
  const [productLookupState, setProductLookupState] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');
  const [lookupAttempt, setLookupAttempt] = useState(0);
  const processingKeys = useRef(new Set<string>());
  const purchaseHandler = useRef<(purchase: Purchase) => Promise<void>>(async () => undefined);
  const configQuery = useQuery({ queryKey: ['annual-membership-config', user?.id], enabled: Boolean(user?.id), queryFn: apiClient.getAnnualMembershipConfig });
  const config = configQuery.data;
  const platformConfig = Platform.OS === 'ios' ? config?.ios : config?.android;
  const productId = platformConfig?.productId || '';
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const diagnostic = useCallback((stage: string, detail: Record<string, unknown> = {}) => {
    void apiClient.recordIapDiagnostic({
      stage,
      platform,
      appVersion: Application.nativeApplicationVersion || '',
      buildVersion: Application.nativeBuildVersion || '',
      productId,
      ...detail,
    }).catch(() => undefined);
  }, [platform, productId]);

  const iap = useIAP({
    onPurchaseSuccess: (purchase) => {
      diagnostic('purchase_success', { productId: purchase.productId });
      void purchaseHandler.current(purchase);
    },
    onPurchaseError: (error) => {
      setProcessing(false);
      diagnostic('purchase_error', { code: String(error.code || ''), message: String(error.message || '') });
      if (error.code !== ErrorCode.UserCancelled) Alert.alert(t('membership.purchaseFailedTitle'), t('membership.purchaseFailedBody'));
    },
    onError: (error) => {
      setProcessing(false);
      diagnostic('purchase_error', { code: 'iap_hook_error', message: String((error as any)?.message || error || '') });
    },
  });

  const subscription = iap.subscriptions.find((item) => item.id === productId);
  const active = config?.allowance?.plan === 'annual';

  purchaseHandler.current = async (purchase) => {
    const key = `${purchase.store}:${purchase.purchaseToken || purchase.transactionId || purchase.id}`;
    if (processingKeys.current.has(key)) return;
    processingKeys.current.add(key);
    setProcessing(true);
    try {
      diagnostic('verification_start', { productId: purchase.productId });
      await apiClient.verifyAnnualMembershipPurchase(Platform.OS === 'ios' ? 'ios' : 'android', {
        transactionId: purchase.transactionId || purchase.id,
        purchaseToken: purchase.purchaseToken,
        productId: purchase.productId,
        environment: Platform.OS === 'ios' ? (purchase as any).environmentIOS : null,
      });
      await iap.finishTransaction({ purchase, isConsumable: false });
      diagnostic('verification_success', { productId: purchase.productId });
      await Promise.all([
        configQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: ['marine-ai-allowance'] }),
      ]);
      Alert.alert(t('membership.purchaseSuccessTitle'), t('membership.purchaseSuccessBody'));
    } catch (error: any) {
      diagnostic('verification_error', { code: String(error?.response?.data?.error || error?.code || ''), message: String(error?.message || '') });
      Alert.alert(t('membership.verificationFailedTitle'), t('membership.verificationFailedBody'));
    } finally {
      processingKeys.current.delete(key);
      setProcessing(false);
    }
  };

  const iapConnected = iap.connected;
  const fetchIapProducts = iap.fetchProducts;
  useEffect(() => { diagnostic('screen_open'); }, [diagnostic]);
  useEffect(() => { diagnostic(iapConnected ? 'store_connected' : 'store_disconnected', { connected: iapConnected }); }, [iapConnected, diagnostic]);
  useEffect(() => {
    if (config) diagnostic('config_ready', { connected: iapConnected });
    else if (configQuery.isError) diagnostic('config_error', { code: String((configQuery.error as any)?.code || ''), message: String((configQuery.error as any)?.message || '') });
  }, [config, configQuery.isError, configQuery.error, diagnostic, iapConnected]);
  useEffect(() => {
    if (!storeSubscriptionsAvailable || !iapConnected || !productId) {
      setProductLookupState('idle');
      return;
    }
    let cancelled = false;
    setProductLookupState('loading');
    diagnostic('product_fetch_start', { connected: iapConnected });
    void fetchIapProducts({ skus: [productId], type: 'subs' })
      .then((products) => diagnostic('product_fetch_success', { connected: iapConnected, productCount: Array.isArray(products) ? products.length : 0 }))
      .catch((error: any) => {
        diagnostic('product_fetch_error', { connected: iapConnected, code: String(error?.code || ''), message: String(error?.message || '') });
        if (!cancelled) setProductLookupState('unavailable');
      });
    const unavailableTimer = setTimeout(() => setProductLookupState((state) => {
      if (state === 'loading') diagnostic('product_unavailable', { connected: iapConnected, productCount: 0 });
      return state === 'loading' ? 'unavailable' : state;
    }), 15000);
    return () => { cancelled = true; clearTimeout(unavailableTimer); };
  }, [fetchIapProducts, iapConnected, productId, diagnostic, lookupAttempt]);

  useEffect(() => {
    if (subscription && productLookupState !== 'ready') setProductLookupState('ready');
  }, [subscription, productLookupState]);

  const buy = async () => {
    if (!storeSubscriptionsAvailable || !config || !subscription || processing) return;
    setProcessing(true);
    try {
      const offer = Platform.OS === 'android'
        ? subscription.subscriptionOffers?.find((item) => item.basePlanIdAndroid === 'yearly') || subscription.subscriptionOffers?.[0]
        : null;
      diagnostic('purchase_request', { connected: iapConnected, productCount: 1 });
      await iap.requestPurchase({
        type: 'subs',
        request: {
          apple: { sku: productId, appAccountToken: config.appAccountToken },
          google: {
            skus: [productId],
            obfuscatedAccountId: config.obfuscatedAccountId,
            subscriptionOffers: offer?.offerTokenAndroid ? [{ sku: productId, offerToken: offer.offerTokenAndroid }] : [],
          },
        },
      });
    } catch (error: any) {
      setProcessing(false);
      diagnostic('purchase_error', { code: String(error?.code || ''), message: String(error?.message || '') });
      if (error?.code !== ErrorCode.UserCancelled) Alert.alert(t('membership.purchaseFailedTitle'), t('membership.purchaseFailedBody'));
    }
  };

  const restore = async () => {
    if (!storeSubscriptionsAvailable || processing) return;
    setProcessing(true);
    try {
      diagnostic('restore_start', { connected: iapConnected });
      await iap.restorePurchases();
      const restored = (await getAvailablePurchases()).filter((item) => item.productId === productId);
      if (!restored.length) Alert.alert(t('membership.restoreEmptyTitle'), t('membership.restoreEmptyBody'));
      for (const purchase of restored) await purchaseHandler.current(purchase);
      diagnostic('restore_success', { productCount: restored.length });
    } catch (error: any) {
      diagnostic('restore_error', { code: String(error?.code || ''), message: String(error?.message || '') });
      Alert.alert(t('membership.purchaseFailedTitle'), t('membership.purchaseFailedBody'));
    } finally { setProcessing(false); }
  };

  const colors = {
    page: isDark ? '#07131F' : '#F2F8FC', card: isDark ? '#102334' : '#FFFFFF', title: isDark ? '#F8FAFC' : '#102A43',
    text: isDark ? '#B9C8D6' : '#52697A', border: isDark ? '#294154' : '#D7E6F1', accent: '#0D6DB7', soft: isDark ? '#123A50' : '#EAF6FF',
  };
  const features = ['credits', 'photo', 'video', 'cache'].map((key) => t(`membership.features.${key}`));
  const storeReady = storeSubscriptionsAvailable && platformConfig?.enabled === true;
  const expectedPriceUsd = Number(config?.priceHintUsd || '29.99');
  const storePriceUsd = subscription?.currency === 'USD' && typeof subscription.price === 'number'
    ? subscription.price
    : null;
  const storePriceMismatch = storePriceUsd !== null && Math.abs(storePriceUsd - expectedPriceUsd) > 0.001;
  const displayedPrice = storePriceMismatch
    ? `$${expectedPriceUsd.toFixed(2)}`
    : subscription?.displayPrice || `$${expectedPriceUsd.toFixed(2)}`;
  const purchaseReady = storeReady && Boolean(subscription) && !storePriceMismatch;
  const productUnavailable = storeReady && productLookupState === 'unavailable' && !subscription;
  const productStatusKey = productUnavailable
    ? (!Device.isDevice ? 'membership.simulatorProductUnavailable' : 'membership.storeProductUnavailable')
    : (storeReady ? 'membership.loadingProduct' : 'membership.storeSetupRequired');
  const memberName = String(profile?.full_name || user?.name || '').trim();
  const memberPhone = String(profile?.contact_phone || '').trim();
  const memberEmail = String(profile?.email || user?.email || '').trim();
  const memberInfoComplete = Boolean(memberName && memberPhone && memberEmail);

  return <Screen style={{ backgroundColor: colors.page }}>
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 48 }}>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} style={{ width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}><ArrowLeft color={colors.title} /></TouchableOpacity>
      <View style={{ marginTop: 22 }}><Sparkles size={30} color={colors.accent} /><Text style={{ marginTop: 12, fontSize: 30, fontWeight: '900', color: colors.title }}>{t('membership.title')}</Text><Text style={{ marginTop: 8, color: colors.text, fontSize: 15, lineHeight: 23 }}>{t('membership.subtitle')}</Text></View>

      {(configQuery.isError || productUnavailable) && <TouchableOpacity accessibilityRole="button" onPress={() => { void configQuery.refetch(); setLookupAttempt(value => value + 1); }} style={{ marginTop: 18, padding: 16, minHeight: 48, backgroundColor: colors.soft, borderRadius: 12 }}><Text style={{ color: colors.accent, fontWeight: '600' }}>{t('common.retry')}</Text></TouchableOpacity>}
      <View style={{ marginTop: 18, padding: 16, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><UserRound size={20} color={colors.accent} /><Text style={{ marginLeft: 8, flex: 1, color: colors.title, fontSize: 16, fontWeight: '900' }}>{t('membership.memberInformation')}</Text><TouchableOpacity onPress={() => router.push('/(tabs)/profile-edit')}><Text style={{ color: colors.accent, fontWeight: '900' }}>{t('membership.editInformation')}</Text></TouchableOpacity></View>{profileLoading ? <ActivityIndicator style={{ marginTop: 14 }} color={colors.accent} /> : <><Text style={{ marginTop: 14, color: colors.title, fontWeight: '800' }}>{memberName || t('membership.missingInformation')}</Text><View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center' }}><Mail size={15} color={colors.accent} /><Text style={{ marginLeft: 7, color: colors.text }}>{memberEmail || t('membership.missingInformation')}</Text></View><View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}><Phone size={15} color={colors.accent} /><Text style={{ marginLeft: 7, color: colors.text }}>{memberPhone || t('membership.missingInformation')}</Text></View>{!memberInfoComplete ? <Text style={{ marginTop: 11, color: '#B45309', fontSize: 12, lineHeight: 18 }}>{t('membership.completeInformationNotice')}</Text> : null}</>}</View>

      <View style={{ marginTop: 22, padding: 20, borderRadius: 24, backgroundColor: colors.card, borderWidth: 1, borderColor: active ? colors.accent : colors.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><View><Text style={{ color: colors.accent, fontWeight: '900' }}>{active ? t('membership.activePlan') : t('membership.annualPlan')}</Text><Text style={{ marginTop: 5, color: colors.title, fontSize: 28, fontWeight: '900' }}>{displayedPrice}<Text style={{ fontSize: 13, color: colors.text }}> / {t('membership.year')}</Text></Text></View>{active ? <View style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.soft }}><Text style={{ color: colors.accent, fontWeight: '900' }}>{t('membership.active')}</Text></View> : null}</View>
        {storePriceMismatch ? <Text style={{ marginTop: 14, color: '#B45309', fontSize: 12, lineHeight: 18 }}>{t('membership.priceSyncNotice')}</Text> : null}
        {!active && storeSubscriptionsAvailable ? <TouchableOpacity disabled={!purchaseReady || processing} onPress={buy} style={{ marginTop: 18, minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: purchaseReady ? colors.accent : '#94A3B8', opacity: processing ? 0.65 : 1 }}>{processing ? <ActivityIndicator color="#FFF" /> : <Text style={{ paddingHorizontal: 14, color: '#FFF', fontSize: 15, fontWeight: '900', textAlign: 'center' }}>{purchaseReady ? t('membership.subscribe', { price: displayedPrice }) : t(productStatusKey)}</Text>}</TouchableOpacity> : null}
        {features.map((feature) => <View key={feature} style={{ marginTop: 15, flexDirection: 'row', alignItems: 'center' }}><View style={{ width: 23, height: 23, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.soft }}><Check size={14} color={colors.accent} /></View><Text style={{ marginLeft: 10, flex: 1, color: colors.text, lineHeight: 20 }}>{feature}</Text></View>)}
        {config?.allowance ? <View style={{ marginTop: 18, padding: 14, borderRadius: 15, backgroundColor: colors.soft }}><Text style={{ color: colors.accent, fontWeight: '900' }}>{t('membership.creditsRemaining', { remaining: config.allowance.remainingCredits, limit: config.allowance.monthlyLimit })}</Text>{config.allowance.membershipExpiresAt ? <Text style={{ marginTop: 4, color: colors.text, fontSize: 12 }}>{t('membership.renewsUntil', { date: new Date(config.allowance.membershipExpiresAt).toLocaleDateString() })}</Text> : null}</View> : null}
        {storeSubscriptionsAvailable ? <TouchableOpacity disabled={processing || !storeReady} onPress={restore} style={{ marginTop: 12, minHeight: 46, borderRadius: 15, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}><RefreshCw size={16} color={colors.accent} /><Text style={{ color: colors.accent, fontWeight: '900' }}>{t('membership.restore')}</Text></TouchableOpacity> : null}
      </View>

      {storeSubscriptionsAvailable ? <Text style={{ marginTop: 18, color: colors.text, fontSize: 12, lineHeight: 19 }}>{t('membership.renewalDisclosure')}</Text> : null}
      <View style={{ marginTop: 12, flexDirection: 'row', gap: 18 }}><TouchableOpacity onPress={() => router.push('/(tabs)/terms-policy')}><Text style={{ color: colors.accent, fontWeight: '800' }}>{t('settingsPage.app.terms')}</Text></TouchableOpacity><TouchableOpacity onPress={() => router.push('/(tabs)/privacy-policy')}><Text style={{ color: colors.accent, fontWeight: '800' }}>{t('settingsPage.app.privacyPolicy')}</Text></TouchableOpacity></View>
    </ScrollView>
  </Screen>;
}
