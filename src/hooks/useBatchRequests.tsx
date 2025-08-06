import { useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BatchRequest {
  id: string;
  type: 'generate-recommendations' | 'filter-recommendations' | 'geocode-address';
  body: any;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

interface BatchResponse {
  id: string;
  data?: any;
  error?: any;
}

class BatchRequestManager {
  private static instance: BatchRequestManager;
  private pendingRequests: Map<string, BatchRequest> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly batchDelay = 2000; // 2 second window for better batching
  private requestDeduplicator: Map<string, Promise<any>> = new Map();
  private lastRequestTime: Map<string, number> = new Map();

  static getInstance(): BatchRequestManager {
    if (!BatchRequestManager.instance) {
      BatchRequestManager.instance = new BatchRequestManager();
    }
    return BatchRequestManager.instance;
  }

  addRequest<T = any>(
    type: BatchRequest['type'],
    body: any
  ): Promise<T> {
    // Create deduplication key based on request content
    const dedupeKey = `${type}-${JSON.stringify(this.normalizeBody(body))}`;
    
    // Check if identical request is already in progress
    if (this.requestDeduplicator.has(dedupeKey)) {
      console.log(`🔄 DEDUPLICATION: Reusing existing request for ${type}`);
      return this.requestDeduplicator.get(dedupeKey) as Promise<T>;
    }

    // Check if similar request was made recently (within 5 minutes)
    const lastRequestTime = this.lastRequestTime.get(dedupeKey);
    if (lastRequestTime && Date.now() - lastRequestTime < 300000) {
      console.log(`⏰ THROTTLING: Similar request made recently for ${type}`);
      return Promise.reject(new Error('Rate limited: Similar request made recently'));
    }

    return new Promise<T>((resolve, reject) => {
      const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const wrappedPromise = new Promise<T>((innerResolve, innerReject) => {
        const request: BatchRequest = {
          id,
          type,
          body,
          resolve: (value) => {
            this.requestDeduplicator.delete(dedupeKey);
            this.lastRequestTime.set(dedupeKey, Date.now());
            innerResolve(value);
            resolve(value);
          },
          reject: (error) => {
            this.requestDeduplicator.delete(dedupeKey);
            innerReject(error);
            reject(error);
          }
        };

        this.pendingRequests.set(id, request);
        this.scheduleBatch();
      });

      this.requestDeduplicator.set(dedupeKey, wrappedPromise);
    });
  }

  private normalizeBody(body: any): any {
    // Normalize coordinates to 3 decimal places for better deduplication
    if (body.latitude && body.longitude) {
      return {
        ...body,
        latitude: Number(body.latitude.toFixed(3)),
        longitude: Number(body.longitude.toFixed(3))
      };
    }
    return body;
  }

  private scheduleBatch() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.processBatch();
    }, this.batchDelay);
  }

  private async processBatch() {
    if (this.pendingRequests.size === 0) return;

    const requests = Array.from(this.pendingRequests.values());
    const requestsPayload = requests.map(req => ({
      id: req.id,
      type: req.type,
      body: req.body
    }));

    console.log(`🚀 BATCH: Processing ${requests.length} requests in single call`);
    
    // Clear pending requests immediately
    this.pendingRequests.clear();
    this.batchTimeout = null;

    try {
      const { data, error } = await supabase.functions.invoke('batch-recommendations', {
        body: { requests: requestsPayload }
      });

      if (error) {
        console.error('Batch request failed:', error);
        // Reject all requests with the batch error
        requests.forEach(req => req.reject(error));
        return;
      }

      const responses: BatchResponse[] = data.responses;
      
      // Resolve each request with its individual response
      requests.forEach(req => {
        const response = responses.find(r => r.id === req.id);
        if (response) {
          if (response.error) {
            req.reject(new Error(response.error));
          } else {
            req.resolve(response.data);
          }
        } else {
          req.reject(new Error('No response found for request'));
        }
      });

    } catch (error) {
      console.error('Batch processing error:', error);
      requests.forEach(req => req.reject(error));
    }
  }
}

export function useBatchRequests() {
  const batchManager = useRef(BatchRequestManager.getInstance());

  const batchInvoke = useCallback(
    <T = any>(
      functionName: 'generate-recommendations' | 'filter-recommendations' | 'geocode-address',
      { body }: { body: any }
    ): Promise<T> => {
      return batchManager.current.addRequest<T>(functionName, body);
    },
    []
  );

  return { batchInvoke };
}