/**
 * URL-Wrapper Statistics API Endpoint
 * 
 * Returns service status along with target URL click, visit, and impression metrics.
 * Supports query parameters:
 *   - /api/stats-json?target=dailyrosary.cf
 *   - /api/stats-json?target=https://erickouassi.com/
 */

export default async function handler(req, res) {
  // 1. Enable CORS & Caching Headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. Extract target parameter
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
    const normalizedTarget = String(rawTarget)
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/$/, '');

    try {
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

  return res.status(200).json(baseResponse);
}

/**
 * Helper function to query metrics for a specific target.
 */
async function getTargetStats(normalizedTarget) {
  if (process.env.GA_PROPERTY_ID && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      const { BetaAnalyticsDataClient } = await import('@google-analytics/data');
      const analyticsDataClient = new BetaAnalyticsDataClient();

      const [response] = await analyticsDataClient.runReport({
        property: `properties/${process.env.GA_PROPERTY_ID}`,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'customEvent:target_hostname' }],
        metrics: [
          { name: 'eventCount' },   // Total Redirect Clicks
          { name: 'screenPageViews' }, // Impressions / Page Views
          { name: 'sessions' },     // Total Visits / Sessions
          { name: 'activeUsers' }    // Unique Visitors
        ],
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
      const totalImpressions = response.rows?.reduce((acc, row) => acc + parseInt(row.metricValues[1].value, 10), 0) || 0;
      const totalVisits = response.rows?.reduce((acc, row) => acc + parseInt(row.metricValues[2].value, 10), 0) || 0;
      const totalUsers = response.rows?.reduce((acc, row) => acc + parseInt(row.metricValues[3].value, 10), 0) || 0;

      return {
        target: normalizedTarget,
        total_redirects: totalClicks,
        impressions: totalImpressions,
        visits: totalVisits,
        unique_visitors: totalUsers,
        period: 'last_30_days',
        source: 'live_ga4'
      };
    } catch (apiErr) {
      console.error('GA4 Reporting API Error:', apiErr);
      throw apiErr;
    }
  }

  // Standalone / Local Default Response Object
  return {
    target: normalizedTarget,
    total_redirects: 0,
    impressions: 0,
    visits: 0,
    unique_visitors: 0,
    period: 'last_30_days',
    source: 'local_counter',
    note: 'Configure GA_PROPERTY_ID env var to pull live GA4 reporting metrics.'
  };
}