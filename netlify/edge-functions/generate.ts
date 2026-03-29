// Netlify Edge Function — proxies Anthropic API calls server-side.
// Non-streaming: waits for the full JSON response from Anthropic and returns it.
// Edge function CPU time excludes I/O wait so Anthropic can take as long as needed.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export default async function handler(req: Request): Promise<Response> {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Wrap everything so an unexpected crash returns JSON instead of Netlify's text/plain 500
  try {
    console.log('[edge/generate] request received');

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    console.log('[edge/generate] API key present:', !!apiKey, '| length:', apiKey?.length ?? 0);

    if (!apiKey || apiKey === 'your-api-key-here') {
      console.error('[edge/generate] ANTHROPIC_API_KEY missing or placeholder');
      return jsonResponse(
        { error: { message: 'Server configuration error: ANTHROPIC_API_KEY is not set in Netlify environment variables. Go to Netlify → Site → Environment Variables and add it.' } },
        500,
      );
    }

    let requestBody: Record<string, unknown>;
    try {
      requestBody = JSON.parse(await req.text());
    } catch {
      return jsonResponse({ error: { message: 'Invalid request body.' } }, 400);
    }

    // Force non-streaming — streaming through a CDN proxy causes mid-response drops.
    // Non-streaming is safe because edge function CPU time excludes I/O wait.
    requestBody.stream = false;

    console.log('[edge/generate] forwarding to Anthropic, model:', requestBody.model);

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
      return jsonResponse({ error: { message: 'Could not reach Anthropic API. Please try again.' } }, 502);
    }

    console.log('[edge/generate] Anthropic status:', anthropicResponse.status);

    // Parse Anthropic's response — guard against non-JSON bodies (e.g. gateway errors)
    let data: unknown;
    try {
      data = await anthropicResponse.json();
    } catch {
      const raw = await anthropicResponse.text().catch(() => '(unreadable)');
      console.error('[edge/generate] Anthropic returned non-JSON body:', raw.slice(0, 200));
      return jsonResponse(
        { error: { message: `Anthropic returned an unexpected response (HTTP ${anthropicResponse.status}). Please try again.` } },
        502,
      );
    }

    console.log('[edge/generate] stop_reason:', (data as Record<string, unknown>).stop_reason ?? 'unknown');

    return jsonResponse(data, anthropicResponse.status);

  } catch (err) {
    // Catch-all: prevents Netlify from returning an opaque text/plain 500
    console.error('[edge/generate] unhandled error:', err);
    return jsonResponse(
      { error: { message: 'An unexpected error occurred. Please try again.' } },
      500,
    );
  }
}

export const config = { path: '/api/generate' };
