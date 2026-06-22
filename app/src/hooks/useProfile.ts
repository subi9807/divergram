import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { useAuth } from './useAuth';

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => apiClient.getProfileSummary(String(user?.id || '')),
  });
}
