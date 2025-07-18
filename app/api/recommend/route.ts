import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"; // Import the admin DB instance

// This tells Next.js to always run this function dynamically and not cache the result.
export const dynamic = 'force-dynamic'

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
  
  let mealType = "Dinner"; // Default value

  try {
    const body = await request.json();
    const { userProfile } = body;
    mealType = body.mealType;
    let filteredDishes: any[] = [];
    let prompt = "";

    try {
        // --- Step 1: Try to fetch and filter from Firestore ---
        let recipesQuery: FirebaseFirestore.Query = adminDb.collection("recipes");

        if (userProfile.dietaryRestrictions?.includes('Vegetarian')) {
            recipesQuery = recipesQuery.where('diet', '==', 'Vegetarian');
        }
        
        recipesQuery = recipesQuery.limit(500);

        const recipesSnapshot = await recipesQuery.get();
        const dishDatabase = recipesSnapshot.docs.map(doc => doc.data());

        if (dishDatabase.length === 0) {
            throw new Error("No recipes found in the database matching your core preferences.");
        }

        filteredDishes = dishDatabase.filter((dish: any) => {
            const mealTypeMatch = dish.course && typeof dish.course === 'string' && dish.course.toLowerCase().includes(mealType.toLowerCase());
            let maxCookingTime = Infinity;
            if (userProfile.cookingTime === "quick") maxCookingTime = 30;
            if (userProfile.cookingTime === "moderate") maxCookingTime = 60;
            const totalCookTime = timeToMinutes(dish.prep_time) + timeToMinutes(dish.cook_time);
            const timeMatch = totalCookTime <= maxCookingTime;
            return mealTypeMatch && timeMatch;
        });

        // --- Prompt using the database ---
        prompt = `
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

    } catch (dbError: any) {
        console.warn("Firestore read failed (likely quota exceeded). Switching to database-free AI generation.", dbError.message);
        
        // --- Fallback Prompt without the database ---
        prompt = `
        You are MyDishGenie, an expert Indian cuisine recommendation AI. Your primary recipe database is currently unavailable. 
        Please generate 3 creative and delicious Indian recipe ideas from your own knowledge that perfectly match the user's profile.

        USER PROFILE:
        - Favorite Cuisines: ${(userProfile.favoriteCuisines || []).join(", ")}
        - Dietary Restrictions: ${(userProfile.dietaryRestrictions || []).join(", ")}
        - Cooking Time Available: ${userProfile.cookingTime}
        - Meal Type: ${mealType}

        Please generate exactly 3 dishes. For each dish, provide:
        {
          "id": "a-unique-id-from-the-dish-name",
          "name": "Recipe Name",
          "cuisine": "Indian Cuisine Type",
          "mealType": "${mealType}",
          "cookingTime": "Estimated total time",
          "spiceLevel": "e.g., medium", 
          "difficulty": "e.g., easy",
          "rating": 4.5,
          "description": "A short, appetizing description of the dish.",
          "ingredients": ["A", "list", "of", "key", "ingredients"],
          "instructions": "Step-by-step cooking instructions.",
          "reason": "A personalized explanation of why this dish is perfect for this user.",
          "image_url": "https://placehold.co/400x300/FFEDD5/8C2D0D?text=AI+Generated"
        }

        Respond with a valid JSON array of exactly 3 dish objects.
        `;
    }


    // --- Call the AI with the chosen prompt ---
    const openrouter = new (require('openai'))({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const completion = await openrouter.chat.completions.create({
      model: "google/gemini-flash-1.5",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }, 
    });

    const recommendationsText = completion.choices[0].message?.content;
    if (!recommendationsText) {
        throw new Error("AI did not return a valid response.");
    }
    
    // The model might return the array inside a key, so we'll handle that.
    let recommendations;
    try {
        const parsedJson = JSON.parse(recommendationsText);
        // Check if the response is an object with a key (like "recommendations") or just an array
        if (Array.isArray(parsedJson)) {
            recommendations = parsedJson;
        } else if (typeof parsedJson === 'object' && parsedJson !== null) {
            const key = Object.keys(parsedJson)[0];
            recommendations = parsedJson[key];
        } else {
            throw new Error("Parsed JSON is not an array or object.");
        }
    } catch (e) {
        throw new Error("Failed to parse AI response as JSON.");
    }

    return NextResponse.json(recommendations);

  } catch (error: any) {
    console.error("Error generating AI recommendations:", error);
    return NextResponse.json({ error: "Failed to generate recommendations.", details: error.message }, { status: 500 });
  }
}
