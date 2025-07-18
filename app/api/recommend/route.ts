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
                // If no unit is specified, assume minutes
                totalMinutes += value;
            }
        }
    }
    return totalMinutes || Infinity;
};


export async function POST(request: NextRequest) {
  // --- Environment Variable Check ---
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    console.error("Firebase Admin SDK service account key is not set in .env.local");
    return NextResponse.json({ error: "Server configuration error: Firebase Admin SDK credentials are not set." }, { status: 500 });
  }
  if (!process.env.GEMINI_API_KEY) {
    console.error("Gemini API key is not set in .env.local");
    return NextResponse.json({ error: "Server configuration error: Gemini API key is not set." }, { status: 500 });
  }
  
  let filteredDishes: any[] = []; // Define here to access in catch block

  try {
    const { userProfile, mealType } = await request.json()

    // --- Step 1: Build a more efficient Firestore query ---
    let recipesQuery: FirebaseFirestore.Query = adminDb.collection("recipes");

    // Pre-filter by diet in the database, as it's a very selective filter.
    if (userProfile.dietaryRestrictions?.includes('Vegetarian')) {
        recipesQuery = recipesQuery.where('diet', '==', 'Vegetarian');
    }
    
    recipesQuery = recipesQuery.limit(500);

    const recipesSnapshot = await recipesQuery.get();
    const dishDatabase = recipesSnapshot.docs.map(doc => doc.data());

    if (dishDatabase.length === 0) {
        throw new Error("No recipes found in the database matching your core preferences.");
    }

    // Step 2: Perform the remaining, more complex filtering in-memory
    filteredDishes = dishDatabase.filter((dish: any) => {
        const mealTypeMatch = dish.course && typeof dish.course === 'string' && dish.course.toLowerCase().includes(mealType.toLowerCase());
        
        const dietaryMatch = (userProfile.dietaryRestrictions || []).every((restriction: string) => {
            if (!dish.diet || typeof dish.diet !== 'string') return true;
            if (restriction === "vegan") {
                return dish.diet.toLowerCase() === 'vegetarian' && !dish.ingredients.toLowerCase().includes('ghee') && !dish.ingredients.toLowerCase().includes('yogurt');
            }
            if (restriction === "vegetarian") {
                return dish.diet.toLowerCase() === 'vegetarian';
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

    // Step 3: Create enhanced AI prompt for Gemini
    const prompt = `
    You are MyDishGenie, an expert Indian cuisine recommendation AI. Analyze the user profile and recommend 3 perfect dishes from the filtered database.

    USER PROFILE:
    - Name: ${userProfile.name}
    - Favorite Cuisines: ${(userProfile.favoriteCuisines || []).join(", ")}
    - Dietary Restrictions: ${(userProfile.dietaryRestrictions || []).join(", ")}
    - Cooking Time Available: ${userProfile.cookingTime}

    CURRENT CONTEXT:
    - Meal Type: ${mealType}

    FILTERED COMPATIBLE DISHES (A selection of ${filteredDishes.length} dishes):
    ${JSON.stringify(filteredDishes.slice(0, 50), null, 2)} 

    Please recommend exactly 3 dishes from the provided list. For each dish, provide:
    {
      "id": "a-unique-id-from-the-dish-name",
      "name": "name from the dataset",
      "cuisine": "cuisine from the dataset",
      "mealType": "${mealType}",
      "cookingTime": "prep_time + cook_time",
      "spiceLevel": "medium", 
      "difficulty": "easy",
      "rating": 4.5,
      "description": "description from the dataset",
      "ingredients": ["An", "array", "of", "string", "ingredients"],
      "instructions": "instructions from the dataset",
      "reason": "A personalized explanation of why this dish is perfect for this specific user.",
      "image_url": "image_url from the dataset"
    }

    Respond with a valid JSON array of exactly 3 dish objects. Ensure the ingredients are a JSON array of strings and that the instructions are included.
    `;

    // --- Step 4: Generate AI recommendations using Gemini ---
    const apiKey = process.env.GEMINI_API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            response_mime_type: "application/json",
        },
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
    const recommendationsText = result.candidates[0].content.parts[0].text;
    const recommendations = JSON.parse(recommendationsText);

    return NextResponse.json(recommendations)

  } catch (error: any) {
    console.error("Error generating AI recommendations:", error);
    
    // --- Smart Fallback System ---
    if (filteredDishes.length > 0) {
        console.log("AI failed. Returning fallback recommendations from filtered list.");
        const fallbackRecommendations = filteredDishes
            .sort(() => 0.5 - Math.random()) // Shuffle the array
            .slice(0, 3) // Get the first 3
            .map((dish: any) => ({ // Format them to match the AI output
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