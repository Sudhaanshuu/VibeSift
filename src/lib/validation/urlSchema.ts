import { z } from 'zod';
import { ScanProfile } from '../../types/audit';

/**
 * Normalizes a user-entered URL string:
 * - Trims whitespace
 * - Prepends https:// if no protocol is present
 * - Lowercases hostname
 * - Removes trailing slash for base domain
 */
export function normalizeTargetUrl(inputUrl: string): string {
  let cleaned = inputUrl.trim();
  if (!cleaned) return '';

  // If no protocol specified, default to https://
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }

  try {
    const parsed = new URL(cleaned);
    // Lowercase the protocol and host
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();

    // Standardize URL string
    let result = parsed.toString();
    // If it's just origin with trailing slash, keep or normalize
    if (parsed.pathname === '/' && !parsed.search && !parsed.hash) {
      result = parsed.origin;
    }
    return result;
  } catch {
    return cleaned;
  }
}

/**
 * Checks if a hostname points to an internal / loopback / private IP (SSRF protection).
 */
export function isInternalOrPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().trim();

  // Common loopback & internal names
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === '[::1]' ||
    host === 'local' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localhost')
  ) {
    return true;
  }

  // AWS metadata endpoint
  if (host === '169.254.169.254' || host === 'metadata.google.internal' || host === 'instance-data') {
    return true;
  }

  // IPv4 Private ranges:
  // 10.0.0.0/8
  // 172.16.0.0/12 (172.16 - 172.31)
  // 192.168.0.0/16
  // 127.0.0.0/8
  // 169.254.0.0/16
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 0) return true;
  }

  return false;
}

/**
 * Zod schema for target URL validation.
 */
export const targetUrlSchema = z
  .string()
  .min(1, 'Please enter a website URL.')
  .transform((val) => normalizeTargetUrl(val))
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    },
    {
      message: 'Invalid URL. Only HTTP and HTTPS protocols are supported.',
    }
  )
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return !isInternalOrPrivateHost(parsed.hostname);
      } catch {
        return false;
      }
    },
    {
      message:
        'Scanning internal, private, loopback, or cloud-metadata destinations is prohibited for safety.',
    }
  )
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        // Valid domain format: at least one dot unless http://localhost which is already blocked
        return parsed.hostname.includes('.') && parsed.hostname.length >= 3;
      } catch {
        return false;
      }
    },
    {
      message: 'Please provide a valid fully qualified domain name (e.g. example.com or https://app.example.com).',
    }
  );

/**
 * Full scan submission schema with profile and authorization acknowledgement.
 */
export const scanSubmissionSchema = z
  .object({
    url: targetUrlSchema,
    profile: z.enum(['baseline_public', 'authorized_deep'] as const),
    acknowledgedTerms: z.boolean().refine((val) => val === true, {
      message: 'You must confirm you have authorization to audit this target.',
    }),
    isDomainVerified: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.profile === 'authorized_deep' && !data.isDomainVerified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['profile'],
        message:
          'Deeper security scans (OWASP ZAP & Nuclei) require verified domain ownership. Please select Baseline Public Scan or verify ownership in Saved Websites first.',
      });
    }
  });

export type ScanSubmissionFormData = z.infer<typeof scanSubmissionSchema>;
