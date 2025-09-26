import React, { useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { EmptyState } from '../../src/components/EmptyState';
import { LoadingOverlay } from '../../src/components/LoadingOverlay';
import { useLogs } from '../../src/hooks/useLogs';
import { LogCard } from '../../src/features/logs/LogCard';
import { Plus } from 'lucide-react-native';

export default function LogsScreen() {
  const { t } = useTranslation();
  const { data: logs, isLoading, error, refetch, isRefreshing } = useLogs();

  const renderLog = ({ item }) => <LogCard log={item} />;

  if (error) {
    return (
      <Screen>
        <EmptyState
          title={t('logs.error')}
          subtitle={t('logs.errorSubtitle')}
          actionText={t('common.retry')}
          onAction={refetch}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <LoadingOverlay visible={isLoading} />
      
      <View className="flex-1">
        <View className="px-6 py-4 bg-white border-b border-secondary-200">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-secondary-800">
                {t('logs.title')}
              </Text>
              <Text className="text-secondary-600 mt-1">
                {t('logs.subtitle')}
              </Text>
            </View>
            <Button
              onPress={() => router.push('/logs/create')}
              variant="primary"
              size="sm"
              className="flex-row items-center"
            >
              <Plus size={16} color="white" className="mr-2" />
              {t('logs.create')}
            </Button>
          </View>
        </View>

        <FlatList
          data={logs || []}
          renderItem={renderLog}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            !isLoading && (
              <EmptyState
                title={t('logs.empty')}
                subtitle={t('logs.emptySubtitle')}
                actionText={t('logs.createFirst')}
                onAction={() => router.push('/logs/create')}
              />
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => refetch()}
              tintColor="#0ea5e9"
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
        />
      </View>
    </Screen>
  );
}