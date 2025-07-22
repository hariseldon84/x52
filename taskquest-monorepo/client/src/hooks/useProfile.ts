import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function useProfile(userId?: string) {
  const queryClient = useQueryClient();

  // Get user profile
  const profileQuery = useQuery<Profile | null>({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    enabled: !!userId,
  });

  // Update profile
  const updateProfile = useMutation(
    async (updates: Partial<Profile>) => {
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    {
      onSuccess: (updatedProfile) => {
        queryClient.setQueryData(['profile', userId], updatedProfile);
      },
    }
  );

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error,
    updateProfile: updateProfile.mutateAsync,
    isUpdating: updateProfile.isLoading,
  };
}
