import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  listSavedSites, 
  addSavedSite, 
  deleteSavedSite, 
  confirmDomainVerification,
  requestDomainVerification
} from '../lib/api/sites';
import { SavedWebsite } from '../types/audit';

export function useSavedSites() {
  return useQuery<SavedWebsite[], Error>({
    queryKey: ['savedSites'],
    queryFn: () => listSavedSites(),
    staleTime: 10000,
  });
}

export function useAddSavedSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (hostname: string) => addSavedSite(hostname),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedSites'] });
    },
  });
}

export function useDeleteSavedSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (siteId: string) => deleteSavedSite(siteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedSites'] });
    },
  });
}

export function useConfirmVerification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (siteId: string) => confirmDomainVerification(siteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedSites'] });
    },
  });
}
