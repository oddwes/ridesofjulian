import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const getSystemPrompt = (ftp: number) => {
  const zones = {
    recovery: { min: Math.round(ftp * 0.0), max: Math.round(ftp * 0.55) },
    endurance: { min: Math.round(ftp * 0.56), max: Math.round(ftp * 0.75) },
    tempo: { min: Math.round(ftp * 0.76), max: Math.round(ftp * 0.90) },
    threshold: { min: Math.round(ftp * 0.91), max: Math.round(ftp * 1.05) },
    vo2max: { min: Math.round(ftp * 1.06), max: Math.round(ftp * 1.20) },
    anaerobic: { min: Math.round(ftp * 1.21), max: Math.round(ftp * 1.50) },
  };

  return process.env.TRAINING_PLAN_SYSTEM_PROMPT || `Gather information on the most effective cycling workouts and generate a detailed training plan based on the user's requirements.

Output each workout as a separate JSON object on its own line (JSONL format). Each workout object should have:
- workoutTitle: descriptive name
- selectedDate: ISO date string (YYYY-MM-DD) starting from the provided start date. Use dates exactly as calendar dates (e.g., if start date is 2025-11-17, first workout should be 2025-11-17, not the day before or after).
- intervals: array of interval objects with:
  - id: unique string identifier
  - name: interval name (e.g., "Warmup", "Z2 Endurance", "VO2 Max")
  - duration: duration in seconds
  - powerMin: minimum power in watts
  - powerMax: maximum power in watts

IMPORTANT: The user has specified a weekly training volume that MUST be met. Ensure the total duration of all workouts in each week adds up to approximately the requested weekly hours. Fill any remaining hours with Z2 blocks. Distribute workouts across the week with appropriate rest.

The user's FTP is ${ftp}W. Calculate power zones based on these FTP percentages:
- Recovery/Z1: ${zones.recovery.min}-${zones.recovery.max}W (0-55% FTP)
- Endurance/Z2: ${zones.endurance.min}-${zones.endurance.max}W (56-75% FTP)
- Tempo/Z3: ${zones.tempo.min}-${zones.tempo.max}W (76-90% FTP)
- Threshold/Z4: ${zones.threshold.min}-${zones.threshold.max}W (91-105% FTP)
- VO2 Max/Z5: ${zones.vo2max.min}-${zones.vo2max.max}W (106-120% FTP)
- Anaerobic/Z6: ${zones.anaerobic.min}-${zones.anaerobic.max}W (121-150% FTP)

Example output (one JSON object per line):
{"id": 1, "workoutTitle": "Base Endurance Ride", "selectedDate": "2024-01-15", "intervals": [{"id": "1", "name": "Warmup", "duration": 600, "powerMin": ${zones.recovery.min}, "powerMax": ${zones.recovery.max}}, {"id": "2", "name": "Z2 Steady", "duration": 3600, "powerMin": ${zones.endurance.min}, "powerMax": ${zones.endurance.max}}, {"id": "3", "name": "Cooldown", "duration": 600, "powerMin": ${zones.recovery.min}, "powerMax": ${zones.recovery.max}}]}
{"id": 2, "workoutTitle": "Threshold Intervals", "selectedDate": "2024-01-17", "intervals": [{"id": "1", "name": "Warmup", "duration": 600, "powerMin": ${zones.recovery.min}, "powerMax": ${zones.recovery.max}}, {"id": "2", "name": "Threshold", "duration": 1200, "powerMin": ${zones.threshold.min}, "powerMax": ${zones.threshold.max}}]}`;
};

export async function POST(request: NextRequest) {
  try {
    const { userPrompt, ftp, blockDuration, weeklyHours, startDate } = await request.json();

    if (!userPrompt || !ftp || !blockDuration || !weeklyHours || !startDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const userMessage = `Create a ${blockDuration}-day training plan starting on ${startDate}. The athlete has ${weeklyHours} hours available per week for training - ensure each week's total workout duration adds up to this amount. Training goal: ${userPrompt}. Distribute workouts across the week with 4-6 workouts per week, ensuring appropriate rest days and progressive load. Include workouts of varying durations and intensities.

Output one workout JSON object per line. Do not wrap in an array.`;

    const stream = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: getSystemPrompt(ftp) },
        { role: "user", content: userMessage },
      ],
      stream: true,
    });

    const encoder = new TextEncoder();
    let buffer = "";

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            buffer += content;

            // Try to parse complete JSON objects (one per line)
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed) {
                try {
                  const workout = JSON.parse(trimmed);
                  // Send workout as SSE
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(workout)}\n\n`)
                  );
                } catch (e) {
                  // Not a complete JSON yet, will be in next iteration
                  buffer = trimmed + '\n' + buffer;
                  console.error("Failed to parse workout:", e);
                }
              }
            }
          }

          // Process any remaining data in buffer
          if (buffer.trim()) {
            try {
              const workout = JSON.parse(buffer.trim());
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(workout)}\n\n`)
              );
            } catch (e) {
              console.error("Failed to parse final buffer:", e);
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error("Error generating plan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

