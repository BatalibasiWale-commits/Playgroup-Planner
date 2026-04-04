// Netlify Edge Function — server-side proxy for Anthropic API.
// Route is declared in netlify.toml [[edge_functions]] — no export const config here.
// Streams the Anthropic SSE response directly to the client so activities appear progressively.

export default async function handler(req: Request): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: { message: 'ANTHROPIC_API_KEY is not set in Netlify environment variables.' } }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    }

    const bodyText = await req.text();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      return new Response(
        JSON.stringify({ error: { message: 'Invalid request body.' } }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    }

    // Keep stream: true — pipe Anthropic's SSE directly to the client.
    // Netlify Edge Functions support streaming natively via Deno's fetch body passthrough.
    parsed.stream = true;

    const anthropic = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(parsed),
    });

    if (!anthropic.ok) {
      // Non-2xx from Anthropic — read body and forward as JSON error
      const errText = await anthropic.text();
      let errBody: unknown;
      try { errBody = JSON.parse(errText); } catch { errBody = { error: { message: errText } }; }
      return new Response(JSON.stringify(errBody), {
        status: anthropic.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Pipe the SSE stream straight through — client's existing SSE parser handles it
    return new Response(anthropic.body, {
      status: anthropic.status,
      headers: {
        'Content-Type': anthropic.headers.get('content-type') ?? 'text/event-stream',
        'Cache-Control': 'no-cache',
        ...corsHeaders,
      },
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: { message: `Edge function error: ${String(err)}` } }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
    );
  }
}
