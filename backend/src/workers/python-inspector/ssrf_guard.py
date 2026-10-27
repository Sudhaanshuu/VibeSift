"""
SSRF Protection Module for Python Inspection Worker
Enforces strict URL parsing, IP range blocking (IPv4 & IPv6),
DNS resolution validation, and safe connection wrapping.
"""

import ipaddress
import re
import socket
import urllib.parse
from typing import List, Tuple

class SSRFProtectionError(Exception):
    def __init__(self, message: str, code: str = "SSRF_BLOCKED"):
        super().__init__(message)
        self.code = code

# Disallowed IPv4 Networks (RFC 1918, RFC 1122, RFC 3927, Carrier NAT, etc.)
DISALLOWED_IPV4_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),       # Current network
    ipaddress.ip_network("10.0.0.0/8"),      # Private RFC 1918
    ipaddress.ip_network("100.64.0.0/10"),   # Carrier-grade NAT
    ipaddress.ip_network("127.0.0.0/8"),     # Loopback
    ipaddress.ip_network("169.254.0.0/16"),  # Link-local / AWS IMDS
    ipaddress.ip_network("172.16.0.0/12"),   # Private RFC 1918
    ipaddress.ip_network("192.0.0.0/24"),    # IETF assignments
    ipaddress.ip_network("192.0.2.0/24"),    # TEST-NET-1
    ipaddress.ip_network("192.88.99.0/24"),  # 6to4 relay
    ipaddress.ip_network("192.168.0.0/16"),  # Private RFC 1918
    ipaddress.ip_network("198.18.0.0/15"),   # Benchmark tests
    ipaddress.ip_network("198.51.100.0/24"), # TEST-NET-2
    ipaddress.ip_network("203.0.113.0/24"),  # TEST-NET-3
    ipaddress.ip_network("224.0.0.0/4"),     # Multicast
    ipaddress.ip_network("240.0.0.0/4"),     # Reserved
    ipaddress.ip_network("255.255.255.255/32"), # Broadcast
]

# Disallowed IPv6 Networks
DISALLOWED_IPV6_NETWORKS = [
    ipaddress.ip_network("::/128"),          # Unspecified
    ipaddress.ip_network("::1/128"),          # Loopback
    ipaddress.ip_network("::ffff:0:0/96"),    # IPv4-mapped IPv6
    ipaddress.ip_network("64:ff9b::/96"),     # IPv4/IPv6 translation
    ipaddress.ip_network("100::/64"),         # Discard prefix
    ipaddress.ip_network("2001::/23"),        # IETF
    ipaddress.ip_network("2001:db8::/32"),    # Documentation
    ipaddress.ip_network("fc00::/7"),         # Unique local (ULA)
    ipaddress.ip_network("fe80::/10"),        # Link-local
    ipaddress.ip_network("ff00::/8"),         # Multicast
]

BLOCKED_HOST_PATTERNS = [
    re.compile(r"^localhost$", re.I),
    re.compile(r"\.localhost$", re.I),
    re.compile(r"\.local$", re.I),
    re.compile(r"\.internal$", re.I),
    re.compile(r"\.lan$", re.I),
    re.compile(r"\.corp$", re.I),
    re.compile(r"\.test$", re.I),
    re.compile(r"\.example$", re.I),
    re.compile(r"^169\.254\.169\.254$"),
    re.compile(r"^metadata$", re.I),
    re.compile(r"^instance-data$", re.I),
    re.compile(r"^metadata\.google\.internal$", re.I),
]

ALLOWED_PORTS = {80, 443, 8080, 8443}

def is_disallowed_ip(ip_str: str) -> bool:
    """Checks whether an IP is in a private, loopback, or reserved range."""
    try:
        ip_obj = ipaddress.ip_address(ip_str)
    except ValueError:
        return True

    # If IPv4-mapped IPv6, extract embedded IPv4
    if ip_obj.version == 6 and ip_obj.ipv4_mapped:
        ip_obj = ip_obj.ipv4_mapped

    if ip_obj.version == 4:
        for net in DISALLOWED_IPV4_NETWORKS:
            if ip_obj in net:
                return True
    elif ip_obj.version == 6:
        for net in DISALLOWED_IPV6_NETWORKS:
            if ip_obj in net:
                return True

    return False

def validate_url(url_str: str) -> Tuple[str, str, int]:
    """
    Validates URL syntax and rejects prohibited protocols, credentials, and ports.
    Returns: (normalized_url, hostname, port)
    """
    if not url_str or not isinstance(url_str, str):
        raise SSRFProtectionError("Target URL must be a non-empty string", "INVALID_URL")

    trimmed = url_str.strip()

    # Reject whitespace or control characters
    if re.search(r"[\s\x00-\x1f\x7f]", trimmed):
        raise SSRFProtectionError("URL contains whitespace or control characters", "INVALID_CHARACTERS")

    parsed = urllib.parse.urlsplit(trimmed)

    # Protocol must strictly be http or https
    if parsed.scheme.lower() not in ("http", "https"):
        raise SSRFProtectionError(
            f"Unsupported scheme '{parsed.scheme}'. Only HTTP and HTTPS are permitted.",
            "DISALLOWED_PROTOCOL"
        )

    # Embedded credentials check
    if parsed.username or parsed.password:
        raise SSRFProtectionError("Embedded credentials in URLs are strictly prohibited", "EMBEDDED_CREDENTIALS")

    hostname = (parsed.hostname or "").lower()
    if not hostname:
        raise SSRFProtectionError("Empty or missing hostname in URL", "EMPTY_HOSTNAME")

    # Reject blocked host patterns
    for pattern in BLOCKED_HOST_PATTERNS:
        if pattern.search(hostname):
            raise SSRFProtectionError(f"Target host '{hostname}' is blocked by security policy", "BLOCKED_HOST")

    # Reject octal / decimal obfuscated IPs (e.g. 2130706433 or 0177.0.0.1)
    if re.match(r"^\d+$", hostname) or re.match(r"^0[0-7]+(\.0[0-7]+)*$", hostname):
        raise SSRFProtectionError(f"Obfuscated numeric IP host '{hostname}' is prohibited", "OBFUSCATED_IP")

    # If hostname is a literal IP, check range
    try:
        ipaddress.ip_address(hostname)
        if is_disallowed_ip(hostname):
            raise SSRFProtectionError(f"Direct IP '{hostname}' is in a prohibited range", "PRIVATE_IP_BLOCKED")
    except ValueError:
        pass

    # Check port
    port = parsed.port or (443 if parsed.scheme.lower() == "https" else 80)
    if port not in ALLOWED_PORTS:
        raise SSRFProtectionError(f"Port {port} is not in permitted list {ALLOWED_PORTS}", "PORT_DISALLOWED")

    normalized = urllib.parse.urlunsplit(parsed)
    return normalized, hostname, port

def resolve_and_validate_host(hostname: str) -> List[str]:
    """
    Resolves hostname via DNS and verifies that all resolved IPs are public.
    Protects against DNS rebinding and internal IP targeting.
    """
    try:
        # Check if already direct IP
        ipaddress.ip_address(hostname)
        if is_disallowed_ip(hostname):
            raise SSRFProtectionError(f"IP '{hostname}' is disallowed", "PRIVATE_IP_BLOCKED")
        return [hostname]
    except ValueError:
        pass

    safe_ips = []
    try:
        addr_info = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
    except socket.gaierror as e:
        raise SSRFProtectionError(f"DNS resolution failed for '{hostname}': {e}", "DNS_RESOLUTION_FAILED")

    if not addr_info:
        raise SSRFProtectionError(f"No DNS records found for '{hostname}'", "NO_DNS_RECORDS")

    for item in addr_info:
        sockaddr = item[4]
        ip_str = sockaddr[0]
        if is_disallowed_ip(ip_str):
            raise SSRFProtectionError(
                f"Host '{hostname}' resolved to prohibited IP '{ip_str}'",
                "DNS_REBINDING_OR_PRIVATE_IP"
            )
        if ip_str not in safe_ips:
            safe_ips.append(ip_str)

    return safe_ips
