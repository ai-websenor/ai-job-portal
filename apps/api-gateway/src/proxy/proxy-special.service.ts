import { Injectable } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import axios from 'axios';
import { ProxyService } from './proxy.service';

/**
 * Handlers for routes that can't use the generic proxyRequest() forwarder:
 * link/event tracking (public, text passthrough), Stripe/Razorpay webhooks
 * (raw-body signature verification), and the AI service (FastAPI, /api/v1
 * prefix stripped, multipart file upload support).
 */
@Injectable()
export class ProxySpecialService {
  constructor(private readonly proxyService: ProxyService) {}

  async forwardLinkEvent(req: FastifyRequest, res: FastifyReply) {
    const path = `/api/v1${req.url.replace('/api/v1', '')}`;
    const baseUrl = this.proxyService.getServiceUrl('job');
    const url = `${baseUrl}${path}`;

    try {
      const response = await axios({
        method: req.method as any,
        url,
        data: req.body,
        headers: {
          ...(req.headers['user-agent'] && { 'user-agent': req.headers['user-agent'] as string }),
        },
        responseType: 'text',
        transformResponse: [(data) => data],
        timeout: 30000,
      });

      const contentType = response.headers['content-type'];
      if (contentType) {
        res.header('content-type', contentType);
      }

      return res.status(response.status).send(response.data);
    } catch (error: any) {
      const status = error.response?.status || 500;
      const data = error.response?.data || { error: 'Internal error' };
      return res.status(status).send(data);
    }
  }

  /**
   * Uses raw body forwarding so Stripe/Razorpay signature verification works
   * correctly — no auth (called by provider servers, not the client).
   */
  async forwardWebhook(req: FastifyRequest, res: FastifyReply) {
    const path = `/api/v1${req.url.replace('/api/v1', '')}`;
    const baseUrl = this.proxyService.getServiceUrl('payment');
    const url = `${baseUrl}${path}`;

    const headers: Record<string, string> = {
      'content-type': req.headers['content-type'] || 'application/json',
    };

    // Forward provider-specific signature headers
    if (req.headers['stripe-signature']) {
      headers['stripe-signature'] = req.headers['stripe-signature'] as string;
    }
    if (req.headers['x-razorpay-signature']) {
      headers['x-razorpay-signature'] = req.headers['x-razorpay-signature'] as string;
    }

    try {
      // Forward the raw body to preserve exact bytes for signature verification
      const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));
      const response = await axios({
        method: req.method as any,
        url,
        data: rawBody,
        headers,
        timeout: 30000,
      });
      return res.send(response.data);
    } catch (error: any) {
      const status = error.response?.status || 500;
      const data = error.response?.data || { error: 'Webhook proxy failed' };
      return res.status(status).send(data);
    }
  }

  /**
   * AI service (FastAPI) uses /ai/* routes directly — strip /api/v1 prefix.
   * Supports multipart (file upload to /ai/parse) with 60s timeout.
   */
  async forwardAiRequest(req: FastifyRequest, res: FastifyReply) {
    // Strip /api/v1 prefix: /api/v1/ai/parse → /ai/parse
    const path = req.url.replace('/api/v1', '');
    const baseUrl = this.proxyService.getServiceUrl('ai');
    const url = `${baseUrl}${path}`;

    const contentType = req.headers['content-type'];
    const isMultipart = contentType?.includes('multipart/form-data');

    const headers: Record<string, string> = {};
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization as string;
    }
    if ((req as any).user) {
      headers['X-User-Id'] = (req as any).user.sub;
    }

    try {
      const axiosConfig: any = {
        method: req.method,
        url,
        headers,
        timeout: 60000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      };

      if (isMultipart) {
        const rawBody = (req as any).rawBody as Buffer | undefined;
        if (!rawBody || rawBody.length === 0) {
          return res.status(400).send({ error: 'No file data received' });
        }
        axiosConfig.data = rawBody;
        axiosConfig.headers['content-type'] = contentType;
      } else if (req.body) {
        axiosConfig.data = req.body;
        axiosConfig.headers['content-type'] = 'application/json';
      }

      const response = await axios(axiosConfig);
      return res.send(response.data);
    } catch (error: any) {
      const status = error.response?.status || 503;
      const data = error.response?.data || { error: 'AI service unavailable' };
      return res.status(status).send(data);
    }
  }
}
