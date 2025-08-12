import DOMPurify from 'dompurify';
import { z } from 'zod';

// Input sanitization
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  return DOMPurify.sanitize(input.trim(), { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
};

export const sanitizeHtml = (html: string): string => {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br'],
    ALLOWED_ATTR: []
  });
};

// Validation schemas with security constraints
export const secureStringSchema = z.string()
  .min(1, 'Field is required')
  .max(255, 'Input too long')
  .refine((val) => !/[<>\"'&]/.test(val), 'Invalid characters detected');

export const displayNameSchema = z.string()
  .min(1, 'Display name is required')
  .max(50, 'Display name must be 50 characters or less')
  .refine((val) => /^[a-zA-Z0-9\s\-_.]+$/.test(val), 'Display name contains invalid characters');

export const addressSchema = z.string()
  .min(1, 'Address is required')
  .max(200, 'Address too long')
  .refine((val) => !/[<>\"'`]/.test(val), 'Address contains invalid characters');

export const emailSchema = z.string()
  .email('Invalid email format')
  .max(254, 'Email too long');

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .refine((val) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(val), 
    'Password must contain at least one uppercase letter, one lowercase letter, and one number');

// Enhanced rate limiting with IP tracking
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private suspiciousIPs: Set<string> = new Set();
  
  constructor(
    private maxRequests: number = 10,
    private windowMs: number = 60000, // 1 minute
    private suspiciousThreshold: number = 50 // Mark IP as suspicious after this many requests
  ) {}
  
  getClientIP(): string {
    // In a real deployment, this would come from headers
    // For now, use a combination of user agent and timestamp as identifier
    return btoa(navigator.userAgent).slice(0, 10) + '_' + Date.now().toString().slice(-4);
  }
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    // Check if IP is marked as suspicious
    if (this.suspiciousIPs.has(identifier)) {
      logSecurityEvent('suspicious_ip_blocked', { 
        identifier, 
        requestCount: validRequests.length 
      });
      return false;
    }
    
    if (validRequests.length >= this.maxRequests) {
      // Mark as suspicious if exceeding threshold significantly
      if (validRequests.length >= this.suspiciousThreshold) {
        this.suspiciousIPs.add(identifier);
        logSecurityEvent('ip_marked_suspicious', { 
          identifier, 
          requestCount: validRequests.length 
        });
      }
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    return true;
  }
  
  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    const validRequests = requests.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - validRequests.length);
  }
  
  clearSuspiciousIP(identifier: string): void {
    this.suspiciousIPs.delete(identifier);
    logSecurityEvent('suspicious_ip_cleared', { identifier });
  }
}

// Global rate limiters for different actions
export const authRateLimiter = new RateLimiter(5, 60000); // 5 attempts per minute
export const apiRateLimiter = new RateLimiter(30, 60000); // 30 requests per minute
export const uploadRateLimiter = new RateLimiter(10, 300000); // 10 uploads per 5 minutes

// Enhanced security logging with anomaly detection and backend integration
export const logSecurityEvent = async (
  event: string,
  details: Record<string, any>,
  userId?: string
) => {
  try {
    const securityLog = {
      timestamp: new Date().toISOString(),
      event,
      userId,
      userAgent: navigator?.userAgent || 'unknown',
      url: window?.location?.href || 'unknown',
      sessionId: sessionStorage.getItem('session-id') || 'unknown',
      referrer: document?.referrer || 'direct',
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...details
    };
    
    console.warn(`Security Event: ${event}`, securityLog);
    
    // Store security events locally for review
    const existingLogs = JSON.parse(localStorage.getItem('security-logs') || '[]');
    existingLogs.push(securityLog);
    
    // Keep only last 200 logs (increased for better monitoring)
    if (existingLogs.length > 200) {
      existingLogs.splice(0, existingLogs.length - 200);
    }
    
    localStorage.setItem('security-logs', JSON.stringify(existingLogs));
    
    // Check for suspicious patterns
    checkForAnomalies(existingLogs, event, userId);
    
    // NEW: Send to backend security monitoring (async, no blocking)
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase.rpc('log_cache_access', {
        p_cache_type: 'security_event',
        p_access_pattern: event,
        p_metadata: {
          ...details,
          event_type: event,
          timestamp: securityLog.timestamp
        }
      });
    } catch (backendError) {
      console.warn('Failed to send security event to backend:', backendError);
    }
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};

// Anomaly detection helper
const checkForAnomalies = (logs: any[], currentEvent: string, userId?: string) => {
  const recentLogs = logs.filter(log => 
    Date.now() - new Date(log.timestamp).getTime() < 300000 // Last 5 minutes
  );
  
  // Check for repeated failed attempts
  const failedAttempts = recentLogs.filter(log => 
    log.event.includes('failed') || log.event.includes('blocked')
  );
  
  if (failedAttempts.length >= 5) {
    console.error('SECURITY ALERT: Multiple failed attempts detected', {
      count: failedAttempts.length,
      userId,
      events: failedAttempts.map(log => log.event)
    });
  }
  
  // Check for unusual user agent changes
  if (userId) {
    const userLogs = recentLogs.filter(log => log.userId === userId);
    const uniqueUserAgents = new Set(userLogs.map(log => log.userAgent));
    
    if (uniqueUserAgents.size > 2) {
      console.warn('SECURITY NOTICE: Multiple user agents for same user', {
        userId,
        userAgents: Array.from(uniqueUserAgents)
      });
    }
  }
};

// Security monitoring utilities
export const getSecurityLogs = (): any[] => {
  try {
    return JSON.parse(localStorage.getItem('security-logs') || '[]');
  } catch {
    return [];
  }
};

export const clearSecurityLogs = (): void => {
  localStorage.removeItem('security-logs');
  logSecurityEvent('security_logs_cleared', { clearedBy: 'user' });
};

export const exportSecurityLogs = (): string => {
  const logs = getSecurityLogs();
  return JSON.stringify(logs, null, 2);
};