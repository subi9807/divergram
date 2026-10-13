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
    queryKey: ['feed', 'dive-records-v2'],
    queryFn: ({ pageParam }) => apiClient.getFeed(pageParam as string | null),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as string | null,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
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
