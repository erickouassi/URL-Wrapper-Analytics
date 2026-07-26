export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  return res.status(200).json({
    service: 'Url-Wrapper Redirect Engine',
    status: 'operational',
    timestamp: new Date().toISOString(),
    telemetry: {
      provider: 'Google Analytics 4',
      protocol: 'Measurement Protocol v2',
      status: Boolean(process.env.GA_MEASUREMENT_ID && process.env.GA_API_SECRET) ? 'configured' : 'pending_env'
    },
    version: '1.0.0'
  });
}
