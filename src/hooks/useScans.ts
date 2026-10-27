import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  submitScan, 
  getScanStatus, 
  listScans, 
  rescanTarget, 
  cancelScan, 
  ScanSubmissionPayload 
} from '../lib/api/scans';
import { resolveFinding } from '../lib/api/reports';
import { AuditReport, ScanProfile, ScanStatus, VerificationStatus } from '../types/audit';

export const TERMINAL_SCAN_STATUSES: ScanStatus[] = ['COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED'];

export function isScanTerminal(status?: ScanStatus): boolean {
  if (!status) return false;
  return TERMINAL_SCAN_STATUSES.includes(status);
}

export function useScansList(filters?: { search?: string; profile?: ScanProfile }) {
  return useQuery<AuditReport[], Error>({
    queryKey: ['scans', filters?.search, filters?.profile],
    queryFn: () => listScans(filters),
    staleTime: 5000,
  });
}

export function useScanReport(scanId?: string) {
  return useQuery<AuditReport, Error>({
    queryKey: ['scan', scanId],
    queryFn: () => {
      if (!scanId) throw new Error('No scan ID provided');
      return getScanStatus(scanId);
    },
    enabled: Boolean(scanId),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      // If terminal status reached, stop polling
      if (isScanTerminal(data.status)) {
        return false;
      }
      return 2000;
    },
    refetchIntervalInBackground: false,
    retry: 2,
  });
}

export function useSubmitScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ScanSubmissionPayload) => submitScan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans'] });
    },
  });
}

export function useRescan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scanId: string) => rescanTarget(scanId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scans'] });
      queryClient.invalidateQueries({ queryKey: ['scan', data.scanId] });
    },
  });
}

export function useCancelScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scanId: string) => cancelScan(scanId),
    onSuccess: (_, scanId) => {
      queryClient.invalidateQueries({ queryKey: ['scan', scanId] });
      queryClient.invalidateQueries({ queryKey: ['scans'] });
    },
  });
}

export function useResolveFinding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      scanId,
      findingId,
      status,
    }: {
      scanId: string;
      findingId: string;
      status: VerificationStatus;
    }) => resolveFinding(scanId, findingId, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scan', variables.scanId] });
    },
  });
}
