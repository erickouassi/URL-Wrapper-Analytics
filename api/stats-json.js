/**
 * URL-Wrapper Statistics API Endpoint
 * 
 * Returns service status along with target URL click metrics.
 * Supports targeted querying via URL or query parameters:
 *   - /api/stats-json?target=dailyrosary.cf
 *   - /api/stats-json?target=https://erickouassi.com/
 */

export default async function handler(req, res) {
  // 1. Enable CORS & Caching Headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  // Allow preflight OPTIONS requests for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. Extract requested target parameter safely
  const rawTarget = req.query.target || req.query.url || null;

  // 3. Build Telemetry Metadata Header
  const isGaConfigured = Boolean(process.env.GA_MEASUREMENT_ID && process.env.GA_API_SECRET);
  
  const baseResponse = {
    service: 'Url-Wrapper Redirect Engine',
    status: 'operational',
    timestamp: new Date().toISOString(),
    telemetry: {
      provider: 'Google Analytics 4',
      protocol: 'Measurement Protocol v2',
      status: isGaConfigured ? 'configured' : 'pending_env'
    },
    version: '1.0.0'
  };

  // 4. Handle Specific Target Search Queries
  if (rawTarget) {
    // Normalize target string (remove protocol, trailing slashes, lower-case)
    const normalizedTarget = String(rawTarget)
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/$/, '');

    try {
      // Fetch stats for the requested target
      const targetStats = await getTargetStats(normalizedTarget);

      return res.status(200).json({
        ...baseResponse,
        query: {
          raw: rawTarget,
          normalized: normalizedTarget
        },
        metrics: targetStats
      });
    } catch (err) {
      return res.status(500).json({
        ...baseResponse,
        error: 'Failed to retrieve analytics metrics for target',
        details: err.message
      });
    }
  }

  // 5. Return Default Service Health Payload (If no target query was provided)
  return res.status(200).json(baseResponse);
}

/**
 * Helper function to query metrics for a specific target.
 */
async function getTargetStats(normalizedTarget) {
  // If GA4 Data API credentials are saved in environment variables
  if (process.env.GA_PROPERTY_ID && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      // Dynamic ES Module import for Vercel ES module runtimes
      const { BetaAnalyticsDataClient } = await import('@google-analytics/data');
      const analyticsDataClient = new BetaAnalyticsDataClient();

      const [response] = await analyticsDataClient.runReport({
        property: `properties/${process.env.GA_PROPERTY_ID}`,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'customEvent:target_hostname' }],
        metrics: [{ name: 'eventCount' }, { name: 'activeUsers' }],
        dimensionFilter: {
          filter: {
            fieldName: 'customEvent:target_hostname',
            stringFilter: {
              matchType: 'CONTAINS',
              value: normalizedTarget,
              caseSensitive: false
            }
          }
        }
      });

      const totalClicks = response.rows?.reduce((acc, row) => acc + parseInt(row.metricValues[0].value, 10), 0) || 0;
      const totalUsers = response.rows?.reduce((acc, row) => acc + parseInt(row.metricValues[1].value, 10), 0) || 0;

      return {
        target: normalizedTarget,
        total_redirects: totalClicks,
        unique_visitors: totalUsers,
        period: 'last_30_days',
        source: 'live_ga4'
      };
    } catch (apiErr) {
      console.error('GA4 Reporting API Error:', apiErr);
      throw apiErr;
    }
  }

  // Standalone / Fallback return object
  return {
    target: normalizedTarget,
    total_redirects: 0,
    unique_visitors: 0,
    period: 'last_30_days',
    source: 'local_counter',
    note: 'Configure GA_PROPERTY_ID env var to pull live GA4 reporting metrics.'
  };
}