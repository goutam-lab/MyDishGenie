// app/api/chef-chat/route.ts
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

interface HistoryItem {
    role: 'user' | 'model';
    parts: { text: string }[];
}

export async function POST(request: NextRequest) {
    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: "Server configuration error: Gemini API key is not set." }, { status: 500 });
    }

    try {
        const { history } = await request.json();

        const apiKey = process.env.GEMINI_API_KEY;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

        // Format the history for the Gemini API
        const formattedHistory: HistoryItem[] = history.map((msg: { role: 'user' | 'model', text: string }) => ({
            role: msg.role,
            parts: [{ text: msg.text }],
        }));

        const payload = {
            contents: [
                // System instruction / context
                {
                    role: "user",
                    parts: [{ text: "You are an expert Indian chef assistant named MyDishGenie. Your goal is to help users with their cooking questions. Keep your answers concise, friendly, and helpful. Focus on Indian cuisine." }]
                },
                {
                    role: "model",
                    parts: [{ text: "Yes, I am MyDishGenie! How can I help you in the kitchen today?" }]
                },
                // Actual conversation history
                ...formattedHistory
            ],
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Gemini API Error:", errorBody);
            throw new Error(`Gemini API request failed with status ${response.status}`);
        }

        const result = await response.json();
        const botResponse = result.candidates[0].content.parts[0].text;

        return NextResponse.json({ response: botResponse });

    } catch (error: any) {
        console.error("Error in chef-chat API:", error);
        return NextResponse.json({ error: "Failed to get a response from the AI chef.", details: error.message }, { status: 500 });
    }
}
