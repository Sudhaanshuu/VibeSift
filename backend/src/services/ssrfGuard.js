import dns from 'node:dns/promises';
import net from 'node:net';

export class SSRFProtectionError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   */
  constructor(message, code = 'SSRF_BLOCKED') {
    super(message);
    this.name = 'SSRFProtectionError';
    this.code = code;
    this.statusCode = 400;
  }
}

/**
 * Parses IPv4 into 32-bit unsigned integer
 * @param {string} ip
 * @returns {number | null}
 */
function ipv4ToInt(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let res = 0;
  for (let i = 0; i < 4; i++) {
    const n = Number(parts[i]);
    if (isNaN(n) || n < 0 || n > 255 || String(n) !== parts[i]) {
      return null;
    }
    res = (res << 8) + n;
  }
  return res >>> 0;
}

/**
 * Checks if 32-bit IPv4 is in CIDR
 * @param {number} ipInt
 * @param {string} cidr
 * @returns {boolean}
 */
function ipInCidr(ipInt, cidr) {
  const [range, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);
  const rangeInt = ipv4ToInt(range);
  if (rangeInt === null) return false;
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

// Disallowed IPv4 CIDR blocks
const DISALLOWED_IPV4_CIDRS = [
  '0.0.0.0/8',       // Current network (RFC 1122)
  '10.0.0.0/8',      // Private network (RFC 1918)
  '100.64.0.0/10',   // Carrier-grade NAT (RFC 6598)
  '127.0.0.0/8',     // Loopback (RFC 1122)
  '169.254.0.0/16',  // Link-local / AWS IMDS (RFC 3927)
  '172.16.0.0/12',   // Private network (RFC 1918)
  '192.0.0.0/24',    // IETF Protocol Assignments (RFC 6890)
  '192.0.2.0/24',    // TEST-NET-1 (RFC 5737)
  '192.88.99.0/24',  // 6to4 Relay Anycast (RFC 7526)
  '192.168.0.0/16',  // Private network (RFC 1918)
  '198.18.0.0/15',   // Network benchmark tests (RFC 2544)
  '198.51.100.0/24', // TEST-NET-2 (RFC 5737)
  '203.0.113.0/24',  // TEST-NET-3 (RFC 5737)
  '224.0.0.0/4',     // Multicast (RFC 5771)
  '240.0.0.0/4',     // Reserved (RFC 1112)
  '255.255.255.255/32' // Broadcast
];

// Disallowed hostname patterns
const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /\.localhost$/i,
  /\.local$/i,
  /\.internal$/i,
  /\.lan$/i,
  /\.corp$/i,
  /\.home$/i,
  /\.test$/i,
  /\.invalid$/i,
  /\.example$/i,
  /^metadata$/i,
  /^169\.254\.169\.254$/i,
  /^instance-data$/i,
  /^metadata\.google\.internal$/i,
];

/**
 * Checks whether an IPv4 address is blocked
 * @param {string} ip
 * @returns {boolean}
 */
export function isDisallowedIpv4(ip) {
  const ipInt = ipv4ToInt(ip);
  if (ipInt === null) return true;
  for (const cidr of DISALLOWED_IPV4_CIDRS) {
    if (ipInCidr(ipInt, cidr)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks whether an IPv6 address is blocked
 * @param {string} ip
 * @returns {boolean}
 */
export function isDisallowedIpv6(ip) {
  const normalized = ip.toLowerCase();

  // Unspecified or loopback
  if (normalized === '::' || normalized === '::1' || normalized === '0:0:0:0:0:0:0:1' || normalized === '0:0:0:0:0:0:0:0') {
    return true;
  }

  // IPv4-mapped IPv6 (::ffff:192.0.2.1)
  const ipv4MappedMatch = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (ipv4MappedMatch) {
    return isDisallowedIpv4(ipv4MappedMatch[1]);
  }

  // Unique Local Address (fc00::/7 -> fc.. or fd..)
  if (/^f[cd][0-9a-f]{2}:/i.test(normalized)) {
    return true;
  }

  // Link-Local Address (fe80::/10 -> fe8.. to feb..)
  if (/^fe[89ab][0-9a-f]:/i.test(normalized)) {
    return true;
  }

  // Multicast (ff00::/8)
  if (/^ff[0-9a-f]{2}:/i.test(normalized)) {
    return true;
  }

  // Documentation (2001:db8::/32)
  if (/^2001:0?db8:/i.test(normalized)) {
    return true;
  }

  return false;
}

/**
 * Checks if any IP string is disallowed
 * @param {string} ip
 * @returns {boolean}
 */
export function isDisallowedIp(ip) {
  const family = net.isIP(ip);
  if (family === 4) return isDisallowedIpv4(ip);
  if (family === 6) return isDisallowedIpv6(ip);
  return true; // Not a valid IP -> disallow
}

/**
 * Validates and normalizes target URL syntax
 * @param {string} rawUrl
 * @returns {{ url: URL, normalizedUrl: string, hostname: string }}
 */
export function validateAndNormalizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new SSRFProtectionError('Target URL must be a non-empty string', 'INVALID_URL');
  }

  const trimmed = rawUrl.trim();

  // Disallow control characters and whitespace
  if (/[\s\x00-\x1F\x7F]/.test(trimmed)) {
    throw new SSRFProtectionError('Target URL contains invalid whitespace or control characters', 'INVALID_CHARACTERS');
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new SSRFProtectionError(`Malformed URL: unable to parse "${trimmed}"`, 'MALFORMED_URL');
  }

  // Protocol check: strictly http or https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SSRFProtectionError(`Unsupported protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.`, 'DISALLOWED_PROTOCOL');
  }

  // Credentials check
  if (parsed.username || parsed.password) {
    throw new SSRFProtectionError('Embedded credentials (username/password) in URLs are strictly prohibited.', 'EMBEDDED_CREDENTIALS');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname) {
    throw new SSRFProtectionError('Hostname cannot be empty', 'EMPTY_HOSTNAME');
  }

  // Reject blocked host patterns
  for (const pattern of BLOCKED_HOST_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new SSRFProtectionError(`Destination host "${hostname}" is blocked (internal or restricted address).`, 'BLOCKED_HOST');
    }
  }

  // Check for obfuscated octal or decimal IP hosts (e.g., 2130706433 or 0177.0.0.1)
  if (/^\d+$/.test(hostname) || /^0[0-7]+(\.0[0-7]+)*$/.test(hostname)) {
    throw new SSRFProtectionError(`Obfuscated integer or octal IP host "${hostname}" is prohibited.`, 'OBFUSCATED_IP');
  }

  // Direct IP in URL check
  const ipFamily = net.isIP(hostname);
  if (ipFamily !== 0) {
    if (isDisallowedIp(hostname)) {
      throw new SSRFProtectionError(`Direct IP address "${hostname}" is in a private, loopback, or reserved range.`, 'PRIVATE_IP_BLOCKED');
    }
  }

  // Port restrictions: Allow standard web ports 80, 443, 8080, 8443
  if (parsed.port) {
    const portNum = parseInt(parsed.port, 10);
    const ALLOWED_PORTS = [80, 443, 8080, 8443];
    if (!ALLOWED_PORTS.includes(portNum)) {
      throw new SSRFProtectionError(`Non-standard port "${parsed.port}" is not permitted. Permitted ports: 80, 443, 8080, 8443.`, 'PORT_DISALLOWED');
    }
  }

  return {
    url: parsed,
    normalizedUrl: parsed.toString(),
    hostname,
  };
}

/**
 * Resolves a hostname safely via DNS and verifies all returned IPs.
 * Protects against DNS rebinding and private IP resolution.
 * @param {string} hostname
 * @returns {Promise<string[]>} Array of validated safe IP addresses
 */
export async function resolveAndValidateHost(hostname) {
  // If it's already an IP, re-check
  const directFamily = net.isIP(hostname);
  if (directFamily !== 0) {
    if (isDisallowedIp(hostname)) {
      throw new SSRFProtectionError(`IP "${hostname}" is in a disallowed range`, 'PRIVATE_IP_BLOCKED');
    }
    return [hostname];
  }

  let addresses = [];

  try {
    const lookupResults = await dns.lookup(hostname, { all: true });
    addresses = lookupResults.map((r) => r.address);
  } catch (err) {
    throw new SSRFProtectionError(`DNS resolution failed for host "${hostname}": ${err.message}`, 'DNS_RESOLUTION_FAILED');
  }

  if (addresses.length === 0) {
    throw new SSRFProtectionError(`No IP addresses found for host "${hostname}"`, 'NO_DNS_RECORDS');
  }

  for (const ip of addresses) {
    if (isDisallowedIp(ip)) {
      throw new SSRFProtectionError(
        `Host "${hostname}" resolved to prohibited IP address "${ip}". Access blocked by SSRF defense policy.`,
        'DNS_REBINDING_OR_PRIVATE_IP'
      );
    }
  }

  return addresses;
}

/**
 * Validates a redirect destination URL during HTTP crawling.
 * Checks protocol, credentials, hostname, and resolved IP.
 * @param {string} redirectUrl
 * @param {string} [currentUrl]
 * @returns {Promise<{ normalizedUrl: string, hostname: string, ip: string }>}
 */
export async function validateRedirectTarget(redirectUrl, currentUrl) {
  let target = redirectUrl;
  if (currentUrl && !redirectUrl.startsWith('http://') && !redirectUrl.startsWith('https://')) {
    target = new URL(redirectUrl, currentUrl).toString();
  }

  const validated = validateAndNormalizeUrl(target);
  const safeIps = await resolveAndValidateHost(validated.hostname);

  return {
    normalizedUrl: validated.normalizedUrl,
    hostname: validated.hostname,
    ip: safeIps[0],
  };
}
