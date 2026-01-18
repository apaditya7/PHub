import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { toFile } from 'openai/uploads';

export const runtime = 'nodejs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 400 });
    }
    const formData = await req.formData();
    const file = formData.get('audio');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }
    // Basic guardrails
    // @ts-ignore: size exists in web File
    const size = (file as any).size || 0;
    const type = (file as any).type || 'unknown';
    if (size === 0) {
      return NextResponse.json({ error: 'Empty audio file' }, { status: 400 });
    }
    if (!/^(audio|video)\//.test(type)) {
      console.warn('Unexpected MIME type for audio:', type);
    }

    // Normalize to a Node File for the OpenAI SDK
    const array = await (file as File).arrayBuffer();
    const nodeFile = await toFile(Buffer.from(array), (file as File).name || 'audio.webm', {
      type: (file as File).type || 'audio/webm',
    });

    async function transcribeWith(model: string) {
      return await openai.audio.transcriptions.create({
        file: nodeFile as any,
        model,
        language: 'en',
        response_format: 'text',
        // temperature: 0,
      } as any);
    }

    let text = '';
    try {
      const res = await transcribeWith('gpt-4o-mini-transcribe');
      text = (res as any).text || '';
      if (!text) text = (typeof res === 'string' ? res : '') as string;
    } catch (e: any) {
      console.warn('gpt-4o-mini-transcribe failed, trying whisper-1:', e?.message);
      const res = await transcribeWith('whisper-1');
      text = (res as any).text || '';
    }

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error('Whisper transcription error:', error);
    const status = error?.status || 500;
    const message = error?.message || 'Failed to transcribe audio';
    return NextResponse.json({ error: message }, { status });
  }
}
