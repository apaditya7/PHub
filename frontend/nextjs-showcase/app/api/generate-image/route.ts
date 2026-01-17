import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const presets = [
  'NSF in No.4 uniform cheerfully processing paperwork in a tidy office',
  'NSF technician maintaining equipment in a clean workshop, friendly vibe',
  'NSF leading a morning briefing with slides, supportive team listening',
  'NSFs on field training sharing a light-hearted, work-safe moment',
  'NSF at the guardroom, organised desk, professional and cheerful tone',
  'NSF helping a teammate with logistics, neatly stacked supplies, wholesome'
];

function rewritePromptForNSFWTheme(raw: string) {
  const base = (raw || '').toString().trim();
  const prefix =
    'Create a friendly, work-safe illustration themed around Singapore National Servicemen (NSFs) working full-time';
  const guidance =
    'Keep content wholesome and respectful. Avoid explicit, sexual, or violent imagery.';
  return `${prefix}. ${guidance} Prompt details: ${base}`;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Server missing OPENAI_API_KEY' },
        { status: 500 }
      );
    }

    const prompt = presets[Math.floor(Math.random() * presets.length)];
    const safePrompt = rewritePromptForNSFWTheme(prompt);

    const openai = new OpenAI({ apiKey });

    const img = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: safePrompt,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'b64_json'
    });

    const b64 = img.data?.[0]?.b64_json;
    if (!b64) {
      return NextResponse.json(
        { error: 'No image data received' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      dataUrl: `data:image/png;base64,${b64}`,
      promptUsed: safePrompt
    });
  } catch (err: any) {
    console.error('Generation error:', err);
    const message = err?.response?.data?.error?.message || err?.message || 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
