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
    refetch,
    isLoading
  } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) => apiClient.getFeed(pageParam as string | null),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as string | null,
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
    isLoading,
    refetch: handleRefresh,
    isRefreshing
  };
}
