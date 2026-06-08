/**
 * Vercel Serverless Function — AI Image Generation
 * 
 * Frontend calls POST /api/generate-image
 * Backend proxies to Agnes AI image generation API.
 * 
 * Environment variable required:
 *   IMAGE_API_KEY — your Agnes AI bearer token
 */

const IMAGE_API_KEY = process.env.IMAGE_API_KEY || '';
const AGNES_API_URL = 'https://apihub.agnes-ai.com/v1';

// Simple CORS headers
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true }).headers(corsHeaders());
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' }).headers(corsHeaders());
  }

  // Validate API key
  if (!IMAGE_API_KEY || IMAGE_API_KEY.length < 10) {
    return res.status(500).json({ error: 'Image API not configured' }).headers(corsHeaders());
  }

  const { prompt, size = '1024x1024' } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' }).headers(corsHeaders());
  }

  try {
    const response = await fetch(`${AGNES_API_URL}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${IMAGE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'agnes-image-2.1-flash',
        prompt: prompt.trim(),
        size: size,
        n: 1,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Agnes AI error:', data);
      return res.status(response.status).json({
        error: data.detail || `API error: ${response.status}`,
      }).headers(corsHeaders());
    }

    // Return the image URL
    if (data.data && data.data[0]) {
      return res.status(200).json({
        success: true,
        url: data.data[0].url || null,
        b64_json: data.data[0].b64_json || null,
      }).headers(corsHeaders());
    }

    return res.status(500).json({ error: 'No image data returned' }).headers(corsHeaders());

  } catch (err) {
    console.error('Image generation failed:', err.message);
    return res.status(500).json({
      error: 'Image generation service unavailable',
      details: err.message,
    }).headers(corsHeaders());
  }
}
