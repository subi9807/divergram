import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Compass, Film, MapPin, Menu, MessageCircle, Search, Settings, Shield, Store, UserRoundCog } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { appRouteMap, type AppRouteId } from '../config/sitemap';

const quickRouteIds: AppRouteId[] = ['messages', 'settings', 'activity', 'saved'];
const moreRouteIds: AppRouteId[] = ['reels', 'resorts', 'location', 'notifications', 'admin'];

const iconMap: Partial<Record<AppRouteId, React.ComponentType<{ size?: number; color?: string }>>> = {
  settings: Settings,
  messages: MessageCircle,
  activity: UserRoundCog,
  saved: Compass,
  reels: Film,
  resorts: Store,
  location: MapPin,
  notifications: Bell,
  admin: Shield,
};

interface DgTabHeaderProps {
  title?: string;
}

export function DgTabHeader({ title }: DgTabHeaderProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  const menuRows = useMemo(
    () => [
      { label: t('menu.quick'), ids: quickRouteIds },
      { label: t('menu.more'), ids: moreRouteIds },
    ],
    [t]
  );

  const go = (routeId: AppRouteId) => {
    setMenuOpen(false);
    router.push(appRouteMap[routeId].path as never);
  };

  return (
    <>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.brandWrap} activeOpacity={0.85} onPress={() => router.replace(appRouteMap.home.path as never)}>
            <LinearGradient colors={['#0d5fa8', '#1198f5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoBox}>
              <Text style={styles.logoText}>DG</Text>
            </LinearGradient>
            <View style={styles.brandTextWrap}>
              <Text style={styles.brandTitle}>Divergram</Text>
              <View style={styles.subtitleRow}>
                <View style={styles.liveDot} />
                <Text numberOfLines={1} style={styles.brandSubtitle}>{title || t('brand.tagline')}</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.actionWrap}>
            <TouchableOpacity style={styles.iconBtn} activeOpacity={0.85} onPress={() => router.push(appRouteMap.search.path as never)}>
              <Search size={18} color="#1e293b" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} activeOpacity={0.85} onPress={() => setMenuOpen(true)}>
              <Menu size={20} color="#1e293b" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <Modal transparent visible={menuOpen} animationType="slide" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            {menuRows.map((section) => (
              <View key={section.label} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.label}</Text>
                {section.ids.map((id) => {
                  const Icon = iconMap[id] || Compass;
                  return (
                    <TouchableOpacity key={id} style={styles.menuCard} activeOpacity={0.85} onPress={() => go(id)}>
                      <View style={styles.menuIconWrap}>
                        <Icon size={18} color="#0d5fa8" />
                      </View>
                      <View style={styles.menuTextWrap}>
                        <Text style={styles.menuTitle}>{t(appRouteMap[id].titleKey)}</Text>
                        <Text style={styles.menuSub}>{t(`menu.desc.${id}`)}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  headerSafe: {
    backgroundColor: '#ffffff',
    borderBottomColor: '#e4ecf4',
    borderBottomWidth: 1,
  },
  header: {
    height: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoBox: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0d5fa8',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  logoText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  brandTextWrap: {
    marginLeft: 10,
    flex: 1,
    paddingRight: 8,
  },
  brandTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  brandSubtitle: {
    color: '#64748b',
    fontSize: 11,
  },
  subtitleRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
    marginRight: 6,
  },
  actionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fbff',
    borderWidth: 1,
    borderColor: '#dde8f3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0d5fa8',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(9,16,27,0.36)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#f7fbff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingBottom: 30,
    paddingHorizontal: 18,
  },
  sheetHandle: {
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#d6e1ee',
    alignSelf: 'center',
    marginBottom: 12,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#7d93a8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee8f2',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    shadowColor: '#0d5fa8',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#ecf5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextWrap: {
    marginLeft: 10,
    flex: 1,
  },
  menuTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  menuSub: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
});
