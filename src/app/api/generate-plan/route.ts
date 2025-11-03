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

  return process.env.TRAINING_PLAN_SYSTEM_PROMPT || `Gather information on the most effective cycling workouts and generate a detailed training plan based on the user's requirements. Return ONLY valid JSON with no additional text or markdown.

The output must be a JSON object with a "workouts" array. Each workout should have:
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

Example format:
{
  "workouts": [
    {
      "id": 1,
      "workoutTitle": "Base Endurance Ride",
      "selectedDate": "2024-01-15",
      "intervals": [
        {"id": "1", "name": "Warmup", "duration": 600, "powerMin": ${zones.recovery.min}, "powerMax": ${zones.recovery.max}},
        {"id": "2", "name": "Z2 Steady", "duration": 3600, "powerMin": ${zones.endurance.min}, "powerMax": ${zones.endurance.max}},
        {"id": "3", "name": "Cooldown", "duration": 600, "powerMin": ${zones.recovery.min}, "powerMax": ${zones.recovery.max}}
      ]
    }
  ]
}`;
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

    const userMessage = `Create a ${blockDuration}-day training plan starting on ${startDate}. The athlete has ${weeklyHours} hours available per week for training - ensure each week's total workout duration adds up to this amount. Training goal: ${userPrompt}. Distribute workouts across the week with 4-6 workouts per week, ensuring appropriate rest days and progressive load. Include workouts of varying durations and intensities.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: getSystemPrompt(ftp) },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error("No content in response");
    }
    
    const plan = JSON.parse(content);

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Error generating plan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

