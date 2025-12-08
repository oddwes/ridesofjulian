import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from '@supabase/supabase-js';

const getSystemPrompt = () =>
  process.env.RIDE_ANALYSIS_SYSTEM_PROMPT ||
  `You are an experienced cycling coach. Analyze the athlete's ride in context of their recent history and current training plan. 
Provide clear, concise feedback, focusing on execution quality, intensity distribution, fatigue, and concrete next-step guidance. 
Avoid repeating the raw data; interpret it.`;

type AnalyzeRequest = {
  ride_history?: unknown;
  training_plan?: unknown;
  current_activity?: unknown;
  workout_plan?: unknown;
  user_id?: string;
  strava_id?: number;
  openaiApiKey: string;
};

type BuildMessageParams = {
  ride_history?: unknown;
  training_plan?: unknown;
  current_activity?: unknown;
  workout_plan?: unknown;
};

const buildUserMessage = ({
  ride_history,
  training_plan,
  current_activity,
  workout_plan,
}: BuildMessageParams) => {
  const parts: string[] = [];
  if (current_activity) {
    parts.push(
      `Current activity (ride to analyze):\n${JSON.stringify(
        current_activity,
        null,
        2
      )}`
    );
  }
  if (ride_history) {
    parts.push(
      `Recent ride history:\n${JSON.stringify(ride_history, null, 2)}`
    );
  }
  if (training_plan) {
    parts.push(
      `Planned training block / plan:\n${JSON.stringify(
        training_plan,
        null,
        2
      )}`
    );
  }
  if (workout_plan) {
    parts.push(
      `Specific workout plan for this ride:\n${JSON.stringify(
        workout_plan,
        null,
        2
      )}`
    );
  }

  parts.push(
    `Based on this context, analyze the ride as a coach would. 
Comment on: how well it matches the plan, load/fatigue implications, intensity distribution, and what to adjust in upcoming sessions. 
Keep the response under 600 words.`
  );

  return parts.join("\n\n");
};

export async function POST(request: NextRequest) {
  try {
    const {
      ride_history,
      training_plan,
      current_activity,
      workout_plan,
      user_id,
      strava_id,
      openaiApiKey,
    }: AnalyzeRequest =
      await request.json();

    if (!ride_history && !training_plan && !current_activity && !workout_plan) {
      return NextResponse.json(
        { error: "At least one of ride_history, training_plan, workout_plan, current_activity is required" },
        { status: 400 }
      );
    }

    if (!openaiApiKey) {
      return NextResponse.json(
        { error: "OpenAI API key is required" },
        { status: 400 }
      );
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Supabase service role not configured" },
        { status: 500 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    const systemPrompt = getSystemPrompt();
    const userMessage = buildUserMessage({
      ride_history,
      training_plan,
      current_activity,
      workout_plan,
    });

    if (user_id && strava_id != null) {
      const { error: upsertPendingError } = await supabase
        .from('ride_analysis')
        .upsert(
          {
            user_id,
            strava_id,
            analysis: null,
          },
          { onConflict: 'user_id,strava_id' }
        );
      if (upsertPendingError) {
        console.error('Error creating pending ride analysis row:', upsertPendingError);
      }
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    if (completion.usage) {
      console.log("analyze-ride tokens", {
        prompt: completion.usage.prompt_tokens,
        completion: completion.usage.completion_tokens,
        total: completion.usage.total_tokens,
      });
    }

    const content = completion.choices[0]?.message?.content ?? "";

    if (user_id && strava_id != null) {
      const { error: upsertError } = await supabase
        .from('ride_analysis')
        .upsert(
          {
            user_id,
            strava_id,
            analysis: content,
          },
          { onConflict: 'user_id,strava_id' }
        );
      if (upsertError) {
        console.error('Error saving ride analysis:', upsertError);
      }
    }

    return NextResponse.json({
      analysis: content,
      usage: completion.usage ?? null,
    });
  } catch (error) {
    console.error("Error analyzing ride:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


