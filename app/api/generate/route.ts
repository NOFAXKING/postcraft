import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PLATFORMS: Record<string, { label: string; limit: number }> = {
  facebook:  { label: "Facebook",    limit: 63206 },
  instagram: { label: "Instagram",   limit: 2200  },
  twitter:   { label: "Twitter / X", limit: 280   },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { platform, config, forSchedule = false } = body;

    if (!platform || !PLATFORMS[platform]) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }
    if (!config?.businessName?.trim()) {
      return NextResponse.json({ error: "Business name required" }, { status: 400 });
    }

    const p = PLATFORMS[platform];

    const prompt = `You are a professional social media content creator.

Business: ${config.businessName}
Type: ${config.businessType || "general"}
Target audience: ${config.targetAudience || "general public"}
Goal: ${config.goal || "Attract clients"}
Tone: ${config.tone || "Professional"}
Language: ${config.language || "English"}
Platform: ${p.label} (max ${p.limit} characters)
Extra context: ${config.extraContext || "none"}
${forSchedule ? `This is one post in a content schedule (${config.frequency || "weekly"}).` : ""}

Generate ONE professional ${p.label} post that achieves the goal. Requirements:
- Written in ${config.language || "English"}
- Matches the ${config.tone || "Professional"} tone
- Stays within the ${p.limit} character limit
- Includes relevant hashtags where appropriate
- Is ready to publish as-is

Also write a short image prompt (1–2 sentences) for a visual to pair with this post.

Respond ONLY with valid JSON — no markdown, no preamble, no explanation:
{"text": "...", "imagePrompt": "..."}`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content.find((b) => b.type === "text")?.text ?? "{}";
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return NextResponse.json({ platform, ...parsed });
  } catch (err) {
    console.error("Generate error:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
