# Url-Wrapper

A serverless prefix URL redirect and analytics service for Vercel. Inspired by OP3, it transparently redirects visitors using HTTP 302 while asynchronously logging telemetry events to Google Analytics 4 via the Measurement Protocol.

## Setup & Deployment

1. **Environment Variables:** Set these in **Vercel Settings > Environment Variables**:
   - `GA_MEASUREMENT_ID` (e.g., `G-XXXXXXXXXX`)
   - `GA_API_SECRET` (Generated under GA4 Admin > Data Streams > Measurement Protocol API secrets)

2. **GA4 Custom Dimensions Configuration:**
   To view subdomains and subdirectories alongside root domain rollups, register these dimensions under **GA4 Admin > Custom Definitions**:
   - `target_full_url` (Event scope)
   - `target_hostname` (Event scope)
   - `target_path` (Event scope)

3. **Deploy:**
   ```bash
   vercel --prod