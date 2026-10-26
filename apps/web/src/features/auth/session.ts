import type { LoginInput, RegisterInput, UserDto, UserResponse } from '@leilao/shared';
import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { ApiError, apiFetch } from '../../lib/api';
import { refreshRealtimeSession } from '../../lib/realtime';

const ME_KEY = ['me'] as const;

export function clearPrivateSessionQueries(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: ['wallet'] });
  queryClient.removeQueries({ queryKey: ['participations'] });
}

/** Usuário logado: `undefined` enquanto carrega, `null` para visitante. */
export function useMe(): UserDto | null | undefined {
  const { data } = useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        return (await apiFetch<UserResponse>('/api/auth/me')).user;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  useEffect(() => {
    if (data !== undefined) refreshRealtimeSession(data?.id ?? null);
  }, [data?.id, data]);
  return data;
}

function useSessionMutation<TInput>(path: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) => apiFetch<UserResponse>(path, { method: 'POST', body: input }),
    onSuccess: ({ user }) => {
      clearPrivateSessionQueries(queryClient);
      queryClient.setQueryData(ME_KEY, user);
      refreshRealtimeSession(user.id);
    },
  });
}

export const useLogin = () => useSessionMutation<LoginInput>('/api/auth/login');
export const useRegister = () => useSessionMutation<RegisterInput>('/api/auth/register');

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<void>('/api/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      queryClient.setQueryData(ME_KEY, null);
      refreshRealtimeSession(null);
      clearPrivateSessionQueries(queryClient);
      void queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] !== 'me' && q.queryKey[0] !== 'wallet',
      });
    },
  });
}
