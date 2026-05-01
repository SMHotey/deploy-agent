import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { createLogger, generateRequestId } from '@/lib/logger';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface GenerateLandingRequest {
  topic: string;
  targetAudience: string;
  tone: string;
  sections: string[];
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const session = await authenticate(request);
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Set OPENAI_API_KEY environment variable.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { topic, targetAudience, tone, sections } = body as GenerateLandingRequest;

    if (!topic || !targetAudience || !sections || !Array.isArray(sections)) {
      return NextResponse.json(
        { error: 'Missing required fields: topic, targetAudience, sections (array)' },
        { status: 400 }
      );
    }

    logger.info('Generating landing page', { topic, targetAudience, tone, sections });

    // Build prompt for OpenAI
    const prompt = `You are a marketing page generator for Deploy Agent, a deployment automation platform.
Generate a JSON configuration for a landing page with the following parameters:
- Topic: ${topic}
- Target Audience: ${targetAudience}
- Tone: ${tone || 'professional'}
- Sections: ${sections.join(', ')}

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
{
  "hero": {
    "title": "string (catchy headline, max 10 words)",
    "subtitle": "string (supporting text, max 20 words)",
    "ctaText": "string (call-to-action button text, max 4 words)",
    "gradient": "string (Tailwind gradient classes, e.g., 'from-blue-600 to-purple-600')"
  },
  "features": [
    {
      "icon": "string (one of: rocket, shield, bolt, chart, code, users, star, heart, zap)",
      "title": "string (feature title, max 5 words)",
      "description": "string (feature description, max 15 words)"
    }
  ],
  "cta": {
    "text": "string (final CTA text, max 10 words)",
    "link": "string (link URL, e.g., /signup)"
  }
}

Generate 3-5 features. Make the content inspiring and concise. Use the Deploy Agent context: we help developers deploy code from git repos or AI-generated code to platforms like Vercel, Netlify, etc.`;

    // Call OpenAI API
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You generate JSON configurations for landing pages. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!openaiRes.ok) {
      const error = await openaiRes.json().catch(() => ({}));
      logger.error('OpenAI API error', { status: openaiRes.status, error });
      return NextResponse.json(
        { error: 'Failed to generate landing page', details: error },
        { status: 502 }
      );
    }

    const openaiData = await openaiRes.json();
    const content = openaiData.choices?.[0]?.message?.content || '';

    // Parse the generated JSON
    let config;
    try {
      // Extract JSON from possible markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/(\{[\s\S]*\})/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      config = JSON.parse(jsonString);
    } catch (parseError) {
      logger.error('Failed to parse OpenAI response', { content, error: parseError });
      return NextResponse.json(
        { error: 'Invalid response from AI', details: 'Could not parse generated config' },
        { status: 502 }
      );
    }

    // Validate config structure
    if (!config.hero || !config.features || !config.cta) {
      return NextResponse.json(
        { error: 'Invalid config structure', details: 'Missing required sections' },
        { status: 502 }
      );
    }

    logger.info('Landing page generated successfully');

    return NextResponse.json({ config });
  } catch (error: any) {
    logger.error('Generate landing error', { error: error.message });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
