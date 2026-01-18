import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY' }), { status: 400 });
    }

    const form = await req.formData();
    const file = form.get('audio');
    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'No audio file provided' }), { status: 400 });
    }

    // Forward to OpenAI Transcriptions API with streaming enabled
    const upstream = new FormData();
    upstream.append('file', file);
    upstream.append('model', 'gpt-4o-mini-transcribe');
    upstream.append('response_format', 'text');
    upstream.append('language', 'en');
    // @ts-ignore
    upstream.append('stream', 'true');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'text/event-stream',
      },
      body: upstream as any,
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      return new Response(JSON.stringify({ error: 'Upstream error', detail: text }), { status: res.status || 500 });
    }

    return new Response(res.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        // CORS for dev
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e: any) {
    console.error('Transcribe stream route error:', e);
    return new Response(JSON.stringify({ error: e?.message || 'Failed to stream' }), { status: 500 });
  }
}

