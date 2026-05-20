import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JobDeepLinkService {
  private readonly appName: string;
  private readonly apiBaseUrl: string;
  private readonly frontendUrl: string;
  private readonly androidStoreUrl: string;
  private readonly iosStoreUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.appName = this.configService.get('APP_NAME') || 'JobBoard';
    this.apiBaseUrl = this.normalizeBaseUrl(
      this.configService.get('API_BASE_URL') || 'https://api.jobboard.com',
    );
    this.frontendUrl = this.normalizeBaseUrl(
      this.configService.get('FRONTEND_URL') || 'https://dev.d3tubn69g0t2tw.amplifyapp.com',
    );
    this.androidStoreUrl = this.configService.get('ANDROID_STORE_URL') || '';
    this.iosStoreUrl = this.configService.get('IOS_STORE_URL') || '';
  }

  getJobShareUrl(jobId: string): string {
    return `${this.apiBaseUrl}/link/event/${encodeURIComponent(jobId)}`;
  }

  getJobAppUrl(jobId: string): string {
    return `jobboard://job/${encodeURIComponent(jobId)}`;
  }

  getJobWebUrl(jobId: string): string {
    return `${this.frontendUrl}/jobs/${encodeURIComponent(jobId)}`;
  }

  generateJobDeepLinkPage(jobId: string, userAgent?: string): string {
    const deepLink = this.getJobAppUrl(jobId);
    const storeUrl = this.getStoreUrl(userAgent);
    const fallbackUrl = this.getJobWebUrl(jobId);
    const pageTitle = 'Job Opportunity';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${this.escapeHtml(pageTitle)} - ${this.escapeHtml(this.appName)}</title>

  <meta property="og:title" content="${this.escapeHtml(pageTitle)}" />
  <meta property="og:description" content="Open this job in ${this.escapeHtml(this.appName)}" />
  <meta property="og:type" content="website" />

  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background:
        radial-gradient(circle at top left, rgba(34, 197, 94, 0.22), transparent 32rem),
        linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      color: #e2e8f0;
    }

    .container {
      background: rgba(15, 23, 42, 0.86);
      border: 1px solid rgba(148, 163, 184, 0.24);
      border-radius: 24px;
      padding: 40px 28px;
      text-align: center;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.34);
      backdrop-filter: blur(18px);
    }

    .logo {
      width: 76px;
      height: 76px;
      background: linear-gradient(135deg, #22c55e 0%, #14b8a6 100%);
      border-radius: 22px;
      margin: 0 auto 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #052e16;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.08em;
    }

    h1 {
      color: #f8fafc;
      font-size: 24px;
      line-height: 1.2;
      margin-bottom: 10px;
    }

    p {
      color: #94a3b8;
      font-size: 16px;
      margin-bottom: 28px;
      line-height: 1.55;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(148, 163, 184, 0.22);
      border-top: 4px solid #22c55e;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 22px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 14px 22px;
      background: linear-gradient(135deg, #22c55e 0%, #14b8a6 100%);
      color: #052e16;
      text-decoration: none;
      border-radius: 999px;
      font-weight: 700;
      font-size: 15px;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 14px 30px rgba(20, 184, 166, 0.28);
    }

    .btn-secondary {
      display: block;
      margin-top: 14px;
      color: #67e8f9;
      text-decoration: none;
      font-size: 14px;
    }
  </style>

  <script>
    var deepLink = ${JSON.stringify(deepLink)};
    var storeUrl = ${JSON.stringify(storeUrl)};
    var fallbackUrl = ${JSON.stringify(fallbackUrl)};
    var timeout = 2500;
    var redirectTimer;

    function getFallbackTarget() {
      return storeUrl || fallbackUrl;
    }

    function cancelFallback() {
      if (redirectTimer) {
        window.clearTimeout(redirectTimer);
        redirectTimer = null;
      }
    }

    function openApp() {
      var iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = deepLink;
      document.body.appendChild(iframe);

      window.location.href = deepLink;

      redirectTimer = window.setTimeout(function() {
        if (document.visibilityState !== 'hidden') {
          window.location.href = getFallbackTarget();
        }
      }, timeout);
    }

    window.onload = openApp;
    window.addEventListener('pagehide', cancelFallback);
    window.addEventListener('blur', cancelFallback);
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden') {
        cancelFallback();
      }
    });
  </script>
</head>
<body>
  <div class="container">
    <div class="logo">JB</div>
    <div class="spinner"></div>
    <h1>Opening ${this.escapeHtml(this.appName)}...</h1>
    <p>Please wait while we open this job in the mobile app.</p>
    <a href="${this.escapeHtml(storeUrl || fallbackUrl)}" class="btn">Download App</a>
    <a href="${this.escapeHtml(deepLink)}" class="btn-secondary">Try opening again</a>
    <a href="${this.escapeHtml(fallbackUrl)}" class="btn-secondary">Continue in browser</a>
  </div>
</body>
</html>
    `.trim();
  }

  private getStoreUrl(userAgent?: string): string {
    const normalizedUserAgent = userAgent?.toLowerCase() || '';

    if (/iphone|ipad|ipod/.test(normalizedUserAgent)) {
      return this.iosStoreUrl || this.frontendUrl;
    }

    if (/android/.test(normalizedUserAgent)) {
      return this.androidStoreUrl || this.frontendUrl;
    }

    return this.androidStoreUrl || this.iosStoreUrl || this.frontendUrl;
  }

  private normalizeBaseUrl(url: string): string {
    return url.replace(/\/+$/, '');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
