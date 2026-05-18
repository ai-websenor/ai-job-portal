import { Controller, Get, Param, Res, ParseUUIDPipe } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '@ai-job-portal/common';
import { ConfigService } from '@nestjs/config';

@ApiExcludeController()
@Controller('link/event')
export class JobRedirectController {
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.frontendUrl =
      this.configService.get('FRONTEND_URL') || 'https://dev.d3tubn69g0t2tw.amplifyapp.com';
  }

  @Get(':jobId')
  @Public()
  async redirectShare(@Param('jobId', ParseUUIDPipe) jobId: string, @Res() res: any) {
    const fallbackUrl = `${this.frontendUrl}/jobs/${jobId}`;
    const appUrl = `jobboard://job-details/${jobId}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Opening Job Opportunity...</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-gradient: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      --accent: #6366f1;
      --accent-hover: #4f46e5;
      --card-bg: rgba(255, 255, 255, 0.03);
      --card-border: rgba(255, 255, 255, 0.08);
      --text: #f8fafc;
      --text-muted: #94a3b8;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Outfit', sans-serif;
      background: var(--bg-gradient);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      perspective: 1000px;
    }
    
    .container {
      background: var(--card-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--card-border);
      border-radius: 24px;
      padding: 48px 32px;
      width: 90%;
      max-width: 440px;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      animation: floatIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    
    @keyframes floatIn {
      0% {
        opacity: 0;
        transform: translateY(30px) scale(0.95);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    
    .logo-container {
      position: relative;
      width: 80px;
      height: 80px;
      margin: 0 auto 28px;
    }
    
    .logo-glow {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: var(--accent);
      filter: blur(20px);
      opacity: 0.4;
      border-radius: 50%;
      animation: pulse 2s infinite ease-in-out;
    }
    
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 0.3; }
      50% { transform: scale(1.15); opacity: 0.5; }
    }
    
    .logo-icon {
      position: relative;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, var(--accent) 0%, #a855f7 100%);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3);
    }
    
    h1 {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 12px;
      background: linear-gradient(to right, #ffffff, #e2e8f0);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    p {
      font-size: 15px;
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 32px;
    }
    
    .spinner-box {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 32px;
    }
    
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 255, 255, 0.05);
      border-radius: 50%;
      border-top-color: var(--accent);
      animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 16px 24px;
      background: linear-gradient(135deg, var(--accent) 0%, #4f46e5 100%);
      color: white;
      border: none;
      border-radius: 14px;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
    }
    
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
    }
    
    .btn:active {
      transform: translateY(0);
    }
    
    .btn-secondary {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: var(--text);
      margin-top: 12px;
      box-shadow: none;
    }
    
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.25);
      box-shadow: none;
    }
    
    .footer {
      margin-top: 32px;
      font-size: 12px;
      color: rgba(148, 163, 184, 0.5);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-container">
      <div class="logo-glow"></div>
      <div class="logo-icon">💼</div>
    </div>
    <h1>Opening in App</h1>
    <p>We are launching the AI Job Portal app to take you directly to this job posting...</p>
    
    <div class="spinner-box" id="spinner-container">
      <div class="spinner"></div>
    </div>
    
    <a id="app-btn" class="btn" href="${appUrl}">Open in App</a>
    <a id="web-btn" class="btn btn-secondary" href="${fallbackUrl}">Continue in Browser</a>
    
    <div class="footer">
      Powered by JOB-BOARD &copy; 2026
    </div>
  </div>

  <script>
    const appUrl = "${appUrl}";
    const fallbackUrl = "${fallbackUrl}";
    
    // Automatically try to open the native app immediately
    window.location.href = appUrl;
    
    // Fallback to web version if application launch fails / app is not installed
    const redirectTimeout = setTimeout(function() {
      window.location.href = fallbackUrl;
    }, 2500);

    // If the browser loses focus (because the native app opened), cancel the fallback redirection
    window.addEventListener("blur", function() {
      clearTimeout(redirectTimeout);
      const spinnerContainer = document.getElementById("spinner-container");
      if (spinnerContainer) {
        spinnerContainer.style.display = "none";
      }
    });
  </script>
</body>
</html>`;

    res.type('text/html').send(html);
  }
}
