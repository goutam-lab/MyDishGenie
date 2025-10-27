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
    role: 'user' | 'assistant' | 'system'; // Include system role
    content: string;
}

// --- Function to call the AI model with fallback ---
async function getChatCompletion(openrouter: OpenAI, messages: HistoryItem[], primaryModel: string, fallbackModel: string): Promise<string | null> {
    try {
        console.log(`Attempting chat completion with primary model: ${primaryModel}`);
        const completion = await openrouter.chat.completions.create({
            model: primaryModel,
            messages: messages as any, // Cast if needed for SDK compatibility
        });
        console.log(`Successfully completed chat with ${primaryModel}`);
        return completion.choices[0].message?.content || null;
    } catch (primaryError: any) {
        console.warn(`Primary chat model (${primaryModel}) failed: ${primaryError.message}. Trying fallback: ${fallbackModel}`);

        const status = primaryError?.status;
        // Check for rate limit or server errors before retrying
        if (status === 429 || (status && status >= 500)) {
            try {
                console.log(`Attempting chat completion with fallback model: ${fallbackModel}`);
                const fallbackCompletion = await openrouter.chat.completions.create({
                    model: fallbackModel,
                    messages: messages as any, // Cast if needed
                });
                console.log(`Successfully completed chat with ${fallbackModel}`);
                return fallbackCompletion.choices[0].message?.content || null;
            } catch (fallbackError: any) {
                console.error(`Fallback chat model (${fallbackModel}) also failed: ${fallbackError.message}`);
                throw new Error(`Primary chat model failed (${primaryError.message || 'Unknown primary error'}) and fallback model failed (${fallbackError.message || 'Unknown fallback error'})`);
            }
        } else {
             console.error(`Primary chat model failed with non-retryable error (Status: ${status}): ${primaryError.message}`);
            throw primaryError; // Re-throw non-retryable errors
        }
    }
}


export async function POST(request: NextRequest) {
    if (!process.env.OPENROUTER_API_KEY) {
        return NextResponse.json({ error: "Server configuration error: OpenRouter API key is not set." }, { status: 500 });
    }

    // --- Define Models ---
    const primaryModel = "google/gemini-2.0-flash-exp:free";
    const fallbackModel = "meituan/longcat-flash-chat:free";

    try {
        const { history } = await request.json();

        if (!Array.isArray(history)) {
             throw new Error("Invalid history format: Expected an array.");
        }

        // Format history, ensuring roles are correct
        const formattedHistory: HistoryItem[] = history.map((msg: { role: 'user' | 'model', text: string }) => {
            if (!msg || typeof msg !== 'object' || !msg.role || !msg.text) {
                console.warn("Skipping invalid message in history:", msg);
                return null;
            }
            return {
                role: msg.role === 'model' ? 'assistant' : 'user',
                content: msg.text,
            };
        }).filter((item): item is HistoryItem => item !== null);


        // Construct messages array including system prompt
        const messages: HistoryItem[] = [
             { role: "system", content: "You are an expert Indian chef assistant named MyDishGenie. Your goal is to help users with their cooking questions related to Indian cuisine. Keep your answers concise, friendly, helpful, and focused on Indian food techniques, ingredients, and recipes. If asked about non-Indian food, gently steer the conversation back or state you specialize in Indian cuisine." },
            ...formattedHistory
        ];

        // Call the helper function with fallback logic
        const botResponse = await getChatCompletion(openrouter, messages, primaryModel, fallbackModel);


        if (!botResponse) {
            throw new Error("AI did not return a valid response content after primary and fallback attempts.");
        }

        console.log("Successfully obtained chat response.");
        return NextResponse.json({ response: botResponse });

    } catch (error: any) {
        console.error("Error in chef-chat API POST handler:", error);
        const details = error.message || 'Unknown API error';
         console.error(error.stack); // Log stack trace
        return NextResponse.json({
            error: "Failed to get a response from the AI chef.",
            details: details
             // Avoid sending full stack to client in production for security
            // source: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}