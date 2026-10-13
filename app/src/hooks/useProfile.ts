import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { useAuth } from './useAuth';

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const userId = String(user?.id || '');
      const [summary, session] = await Promise.all([
        apiClient.getProfileSummary(userId),
        apiClient.getSession().catch(() => null),
      ]);
      if (!summary) return summary;
      const sessionProfile = String(session?.profile?.id || '') === userId ? session.profile : null;
      return {
        ...summary,
        contact_phone: String(sessionProfile?.contact_phone || summary.contact_phone || ''),
      };
    },
  });
}
