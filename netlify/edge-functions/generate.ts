// Netlify Edge Function — streams Anthropic SSE directly to the client.
// Edge functions run at the CDN edge using the Deno runtime. Unlike Lambda
// functions (10 s hard timeout), they can stream indefinitely, which is
// required for the long Anthropic generation calls this app makes.

export default async function handler(req: Request): Promise<Response> {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  console.log('[edge/generate] request received, method:', req.method);

  // Edge functions read env vars via Deno.env, not process.env
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  console.log('[edge/generate] ANTHROPIC_API_KEY present:', !!apiKey, '| key length:', apiKey?.length ?? 0);

  if (!apiKey || apiKey === 'your-api-key-here') {
    console.log('[edge/generate] ERROR: API key missing or placeholder');
    return new Response(
      JSON.stringify({ error: { message: 'ANTHROPIC_API_KEY is not configured in Netlify environment variables.' } }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      },
    );
  }

  let requestBody: Record<string, unknown>;
  try {
    requestBody = JSON.parse(await req.text());
  } catch {
    return new Response(JSON.stringify({ error: { message: 'Invalid request body.' } }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // Force non-streaming. Streaming through a proxy (CDN or dev server) causes
  // the connection to be cut mid-response. Non-streaming waits for the full
  // JSON payload, which is safe here because edge function CPU time excludes
  // I/O wait — Anthropic can take as long as it needs.
  requestBody.stream = false;

  console.log('[edge/generate] forwarding to Anthropic (non-streaming), model:', requestBody.model);

  let anthropicResponse: Response;
  try {
    anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });
  } catch (err) {
    console.error('[edge/generate] network error reaching Anthropic:', err);
    return new Response(
      JSON.stringify({ error: { message: 'Failed to reach Anthropic API. Please try again.' } }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      },
    );
  }

  const data = await anthropicResponse.json();
  console.log('[edge/generate] Anthropic responded, status:', anthropicResponse.status, '| stop_reason:', (data as Record<string, unknown>).stop_reason ?? 'unknown');

  return new Response(JSON.stringify(data), {
    status: anthropicResponse.status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

// Serve this edge function at /api/generate, matching the Vite dev middleware path.
export const config = { path: '/api/generate' };
