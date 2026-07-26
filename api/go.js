import crypto from 'node:crypto';

export default async function handler(req, res) {
  // 1. Raw URL parsing to preserve complex query strings and subdomains
  const rawUrl = req.url || '';
  const prefixIndex = rawUrl.indexOf('/go/');

  if (prefixIndex === -1) {
    return res.status(400).json({
      error: 'Invalid route format.',
      usage: '/go/https://subdomain.example.com/path/file.mp3?key=val'
    });
  }

let targetUrl = rawUrl.substring(prefixIndex + 4);

  // Fix single-slash issues caused by browser path normalization (e.g. "https:/example.com" -> "https://example.com")
  targetUrl = targetUrl.replace(/^(https?:\/)(?!\/)/i, '$1/');

  // If no protocol was provided at all (e.g. "/go/erickouassi.com"), default to https://
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = `https://${targetUrl}`;
  }

  // Normalize full URL structure
  try {
    const parsedTarget = new URL(targetUrl);
    targetUrl = parsedTarget.toString();
  } catch (err) {
    return res.status(400).json({
      error: 'Malformed target URL string'
    });
  }

  // 2. Client context extraction
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const referer = req.headers['referer'] || req.headers['referrer'] || 'Direct';
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || '0.0.0.0';

  // 3. Fire-and-await GA4 telemetry with strict timeout
  try {
    await sendGa4Telemetry({ targetUrl, userAgent, referer, clientIp });
  } catch (err) {
    console.error('[GA4 Logging Error]:', err.message);
  }

  // 4. HTTP 302 Temporary Redirect response
  res.setHeader('Location', targetUrl);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Access-Control-Allow-Origin', '*');

  return res.status(302).end();
}

async function sendGa4Telemetry({ targetUrl, userAgent, referer, clientIp }) {
  const measurementId = process.env.GA_MEASUREMENT_ID;
  const apiSecret = process.env.GA_API_SECRET;

  if (!measurementId || !apiSecret) {
    return; // Pass through if env vars aren't set
  }

  const endpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;

  // Parse target URL into root domain vs. granular components
  let rootDomain = targetUrl;
  let targetHostname = '';
  let targetPath = '';

  try {
    const parsed = new URL(targetUrl);
    targetHostname = parsed.hostname;
    targetPath = parsed.pathname + parsed.search;

    const hostParts = parsed.hostname.split('.');
    const rootHost = hostParts.slice(-2).join('.');
    rootDomain = `${parsed.protocol}//${rootHost}`;
  } catch (e) {
    // Fallback if URL parsing fails
  }

  // Deterministic daily client ID (GDPR-compliant IP anonymization)
  const dateStr = new Date().toISOString().slice(0, 10);
  const clientId = crypto.createHash('sha256').update(`${clientIp}-${userAgent}-${dateStr}`).digest('hex');

  const payload = {
    client_id: clientId,
    events: [
      {
        name: 'page_view',
        params: {
          // Aggregated location for primary domain views
          page_location: rootDomain,
          
          // Granular custom dimensions for breakdowns in GA4
          target_full_url: targetUrl,
          target_hostname: targetHostname,
          target_path: targetPath,
          
          page_referrer: referer,
          engagement_time_msec: 100,
          ip_override: clientIp
        }
      },
      {
        name: 'url_redirect',
        params: {
          destination_url: targetUrl,
          destination_host: targetHostname
        }
      }
    ]
  };

  // Abort controller prevents hanging timeouts from blocking the 302 response
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': userAgent
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch (e) {
    // Suppress network errors so redirect remains unaffected
  } finally {
    clearTimeout(timeout);
  }
}