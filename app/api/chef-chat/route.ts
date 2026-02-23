import { type NextRequest, NextResponse } from "next/server";
import OpenAI from 'openai';
import { pushLog } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

// Initialize the OpenAI client to use the OpenRouter API
const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://mydishgenie.vercel.app", 
    "X-Title": "MyDishGenie",
  },
});

interface HistoryItem {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

// --- Function to call the AI model with fallback ---
async function getChatCompletion(openrouter: OpenAI, messages: HistoryItem[], primaryModel: string, fallbackModel: string): Promise<string | null> {
    try {
        console.log(`Attempting chat completion with primary model: ${primaryModel}`);
        const completion = await openrouter.chat.completions.create({
            model: primaryModel,
            messages: messages as any,
        });
        console.log(`Successfully completed chat with ${primaryModel}`);
        return completion.choices[0].message?.content || null;
    } catch (primaryError: any) {
        console.warn(`Primary chat model (${primaryModel}) failed: ${primaryError.message}. Trying fallback: ${fallbackModel}`);

        const status = primaryError?.status;
        if (status === 429 || (status && status >= 500)) {
            try {
                const fallbackCompletion = await openrouter.chat.completions.create({
                    model: fallbackModel,
                    messages: messages as any,
                });
                return fallbackCompletion.choices[0].message?.content || null;
            } catch (fallbackError: any) {
                throw new Error(`Primary and fallback models failed.`);
            }
        } else {
            throw primaryError;
        }
    }
}

export async function POST(request: NextRequest) {
    const startTime = Date.now(); // Start tracking latency
    
    if (!process.env.OPENROUTER_API_KEY) {
        return NextResponse.json({ error: "Server configuration error: OpenRouter API key is not set." }, { status: 500 });
    }

    const primaryModel = "google/gemini-2.0-flash-exp:free";
    const fallbackModel = "meituan/longcat-flash-chat:free";

    try {
        const { history } = await request.json();

        if (!Array.isArray(history)) {
             throw new Error("Invalid history format: Expected an array.");
        }

        const formattedHistory: HistoryItem[] = history.map((msg: { role: 'user' | 'model', text: string }) => {
            if (!msg || typeof msg !== 'object' || !msg.role || !msg.text) return null;
            return {
                role: msg.role === 'model' ? 'assistant' : 'user',
                content: msg.text,
            };
        }).filter((item): item is HistoryItem => item !== null);

        const messages: HistoryItem[] = [
             { role: "system", content: "You are an expert Indian chef assistant named MyDishGenie. Your goal is to help users with their cooking questions related to Indian cuisine." },
            ...formattedHistory
        ];

        const botResponse = await getChatCompletion(openrouter, messages, primaryModel, fallbackModel);

        if (!botResponse) {
            throw new Error("AI did not return a valid response content.");
        }

        // Push success log to InfraGuardian
        await pushLog({
            message: "Chef-Chat response generated successfully",
            level: 'info',
            latency: Date.now() - startTime
        });

        return NextResponse.json({ response: botResponse });

    } catch (error: any) {
        const duration = Date.now() - startTime;
        
        // Push error log to InfraGuardian
        await pushLog({
            message: `Chef-Chat Error: ${error.message || 'Unknown API error'}`,
            level: 'error',
            latency: duration
        });

        return NextResponse.json({
            error: "Failed to get a response from the AI chef.",
            details: error.message || 'Unknown API error'
        }, { status: 500 });
    }
}