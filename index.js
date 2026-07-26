// index.js (Root entrypoint)
export default function handler(req, res) {
  res.status(200).json({
    status: 'online',
    service: 'Url-Wrapper Redirect Engine',
    documentation: '/stats'
  });
}