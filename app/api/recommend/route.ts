import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin";
import OpenAI from 'openai';

// This tells Next.js to always run this function dynamically and not cache the result.
export const dynamic = 'force-dynamic'

// Initialize the OpenAI client to use the OpenRouter API
const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://mydishgenie.vercel.app", // Replace with your actual deployed URL
    "X-Title": "MyDishGenie",
  },
});

// Helper function to safely convert string times to minutes
const timeToMinutes = (timeString: string): number => {
    if (!timeString) return Infinity;
    const parts = timeString.toLowerCase().split(' ');
    let totalMinutes = 0;
    for (let i = 0; i < parts.length; i++) {
        const value = parseInt(parts[i]);
        if (!isNaN(value)) {
            if (parts[i+1] && (parts[i+1].includes('hour') || parts[i+1].includes('hr'))) {
                totalMinutes += value * 60;
            } else if (parts[i+1] && (parts[i+1].includes('minute') || parts[i+1].includes('min'))) {
                totalMinutes += value;
            } else {
                totalMinutes += value;
            }
        }
    }
    return totalMinutes || Infinity;
};


export async function POST(request: NextRequest) {
  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: "Server configuration error: OpenRouter API key is not set." }, { status: 500 });
  }
  
  let filteredDishes: any[] = [];
  let mealType = "Dinner"; // Default value

  try {
    const body = await request.json();
    const { userProfile } = body;
    mealType = body.mealType; // Assign mealType from request

    const recipesCollectionRef = adminDb.collection("recipes");
    const recipesSnapshot = await recipesCollectionRef.get();
    const dishDatabase = recipesSnapshot.docs.map(doc => doc.data());

    if (dishDatabase.length === 0) {
        throw new Error("No recipes found in the database.");
    }

    filteredDishes = dishDatabase.filter((dish: any) => {
        const mealTypeMatch = dish.course && typeof dish.course === 'string' && dish.course.toLowerCase().includes(mealType.toLowerCase());
        const dietaryMatch = (userProfile.dietaryRestrictions || []).every((restriction: string) => {
            if (!dish.diet || typeof dish.diet !== 'string') return true;
            if (restriction === "vegetarian" || restriction === "vegan") {
                return dish.diet.toLowerCase() === restriction;
            }
            return true;
        });
        let maxCookingTime = Infinity;
        if (userProfile.cookingTime === "quick") maxCookingTime = 30;
        if (userProfile.cookingTime === "moderate") maxCookingTime = 60;
        const totalCookTime = timeToMinutes(dish.prep_time) + timeToMinutes(dish.cook_time);
        const timeMatch = totalCookTime <= maxCookingTime;
        return mealTypeMatch && dietaryMatch && timeMatch;
    });

    const prompt = `
    You are MyDishGenie, an expert Indian cuisine recommendation AI. Analyze the user profile and recommend 3 perfect dishes from the filtered database.

    USER PROFILE:
    - Favorite Cuisines: ${(userProfile.favoriteCuisines || []).join(", ")}
    - Dietary Restrictions: ${(userProfile.dietaryRestrictions || []).join(", ")}
    - Cooking Time Available: ${userProfile.cookingTime}
    - Meal Type: ${mealType}

    FILTERED DISHES:
    ${JSON.stringify(filteredDishes.slice(0, 50), null, 2)} 

    Please recommend exactly 3 dishes from the provided list. Respond with a valid JSON array of 3 objects with these exact keys: "id", "name", "cuisine", "mealType", "cookingTime", "spiceLevel", "difficulty", "rating", "description", "ingredients" (as an array of strings), "instructions", "reason", "image_url".
    `;

    const completion = await openrouter.chat.completions.create({
      model: "google/gemini-flash-1.5", // --- FIX: Correct model name ---
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }, 
    });

    const recommendationsText = completion.choices[0].message?.content;
    if (!recommendationsText) {
        throw new Error("AI did not return a valid response.");
    }
    
    // The model is instructed to return a JSON array, so we parse it directly.
    const recommendations = JSON.parse(recommendationsText);

    return NextResponse.json(recommendations);

  } catch (error: any) {
    console.error("Error generating AI recommendations:", error);
    if (filteredDishes.length > 0) {
        const fallbackRecommendations = filteredDishes
            .sort(() => 0.5 - Math.random())
            .slice(0, 3)
            .map((dish: any) => ({
                id: dish.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase(),
                name: dish.name,
                cuisine: dish.cuisine,
                mealType: mealType,
                cookingTime: `${timeToMinutes(dish.prep_time) + timeToMinutes(dish.cook_time)} mins`,
                spiceLevel: "medium",
                difficulty: "easy",
                rating: 4.3,
                description: dish.description,
                ingredients: dish.ingredients.split(',').slice(0, 5),
                instructions: dish.instructions,
                reason: `A popular choice that matches your preferences. Our AI is currently busy, but we think you'll love this!`,
                image_url: dish.image_url,
            }));
        return NextResponse.json(fallbackRecommendations);
    }
    
    return NextResponse.json({ error: "Failed to generate recommendations.", details: error.message }, { status: 500 });
  }
}
