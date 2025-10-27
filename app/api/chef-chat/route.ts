import { type NextRequest, NextResponse } from "next/server";
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

// Initialize the OpenAI client to use the OpenRouter API
const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://mydishgenie.vercel.app", // Replace with your actual deployed URL
    "X-Title": "MyDishGenie", // Replace with your App Name
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

        // Ensure history is an array
        if (!Array.isArray(history)) {
             throw new Error("Invalid history format: Expected an array.");
        }


        // Format the history for the OpenAI SDK
        const formattedHistory: HistoryItem[] = history.map((msg: { role: 'user' | 'model', text: string }) => {
            // Validate message structure
            if (!msg || typeof msg !== 'object' || !msg.role || !msg.text) {
                console.warn("Skipping invalid message in history:", msg);
                return null; // Skip invalid messages
            }
            return {
                role: msg.role === 'model' ? 'assistant' : 'user',
                content: msg.text,
            };
        }).filter((item): item is HistoryItem => item !== null); // Filter out any nulls from invalid messages


        // Add system prompt
        const messages: HistoryItem[] = [
             { role: "system", content: "You are an expert Indian chef assistant named MyDishGenie. Your goal is to help users with their cooking questions related to Indian cuisine. Keep your answers concise, friendly, helpful, and focused on Indian food techniques, ingredients, and recipes. If asked about non-Indian food, gently steer the conversation back or state you specialize in Indian cuisine." },
            ...formattedHistory
        ];


        const completion = await openrouter.chat.completions.create({
            // ** CHANGE MODEL NAME HERE **
            model: "google/gemini-pro-1.5:free", // Use a known working or free model
            messages: messages as any, // Cast to any if type mismatch occurs with SDK versions
        });

        const botResponse = completion.choices[0].message?.content;

        if (!botResponse) {
            throw new Error("AI did not return a valid response content.");
        }

        return NextResponse.json({ response: botResponse });

    } catch (error: any) {
        console.error("Error in chef-chat API:", error);
         // Check for specific API error details if available
        const details = error.response?.data?.error?.message || error.message;
        return NextResponse.json({ error: "Failed to get a response from the AI chef.", details: details }, { status: 500 });
    }
}