import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { transcript } = await req.json();

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json(
        { error: 'Invalid transcript' },
        { status: 400 }
      );
    }

    if (transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'Transcript is empty' },
        { status: 400 }
      );
    }

    async function summarizeWithModel(model: string) {
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes transcripts concisely. Provide a brief, clear summary of the main points in 2-3 sentences.'
          },
          {
            role: 'user',
            content: `Summarize the following transcript:\n\n${transcript}`
          }
        ],
        max_tokens: 200,
        temperature: 0.5,
      });
      return completion.choices[0].message.content || 'Unable to generate summary';
    }

    let summary: string;
    try {
      summary = await summarizeWithModel('gpt-4o-mini');
    } catch (e: any) {
      // Fallback to a widely available model if the primary model is unavailable
      console.warn('Primary model failed, attempting fallback:', e?.message);
      summary = await summarizeWithModel('gpt-3.5-turbo');
    }

    return NextResponse.json({ summary });

  } catch (error: any) {
    console.error('OpenAI API error:', error);

    return NextResponse.json(
      { error: 'Failed to generate summary', details: error.message },
      { status: 500 }
    );
  }
}
