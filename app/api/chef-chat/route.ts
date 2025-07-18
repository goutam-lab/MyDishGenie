import { type NextRequest, NextResponse } from "next/server";
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

// Initialize the OpenAI client to use the OpenRouter API
const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://mydishgenie.vercel.app", // Replace with your actual deployed URL
    "X-Title": "MyDishGenie",
  },
});

interface HistoryItem {
    role: 'user' | 'assistant';
    content: string;
}

export async function POST(request: NextRequest) {
    if (!process.env.OPENROUTER_API_KEY) {
        return NextResponse.json({ error: "Server configuration error: OpenRouter API key is not set." }, { status: 500 });
    }

    try {
        const { history } = await request.json();

        // Format the history for the OpenAI SDK
        const formattedHistory: HistoryItem[] = history.map((msg: { role: 'user' | 'model', text: string }) => ({
            role: msg.role === 'model' ? 'assistant' : 'user',
            content: msg.text,
        }));

        const completion = await openrouter.chat.completions.create({
            model: "google/gemini-flash-1.5", // --- FIX: Correct model name ---
            messages: [
                { role: "system", content: "You are an expert Indian chef assistant named MyDishGenie. Your goal is to help users with their cooking questions. Keep your answers concise, friendly, and helpful. Focus on Indian cuisine." },
                ...formattedHistory
            ],
        });

        const botResponse = completion.choices[0].message?.content;

        if (!botResponse) {
            throw new Error("AI did not return a valid response.");
        }

        return NextResponse.json({ response: botResponse });

    } catch (error: any) {
        console.error("Error in chef-chat API:", error);
        return NextResponse.json({ error: "Failed to get a response from the AI chef.", details: error.message }, { status: 500 });
    }
}
