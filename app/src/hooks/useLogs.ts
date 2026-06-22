import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { useState } from 'react';

export function useLogs() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data,
    error,
    refetch,
    isLoading
  } = useQuery({
    queryKey: ['logs'],
    queryFn: () => apiClient.getLogs(),
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  return {
    data,
    error,
    isLoading,
    refetch: handleRefresh,
    isRefreshing
  };
}