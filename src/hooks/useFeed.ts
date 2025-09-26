import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { useState } from 'react';

export function useFeed() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    refetch,
    isLoading
  } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam = null }) => apiClient.getFeed(pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  return {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: status === 'pending',
    refetch: handleRefresh,
    isRefreshing
  };
}