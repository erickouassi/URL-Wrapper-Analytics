export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  return res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    env: {
      ga_measurement_id_set: Boolean(process.env.GA_MEASUREMENT_ID),
      ga_api_secret_set: Boolean(process.env.GA_API_SECRET)
    }
  });
}