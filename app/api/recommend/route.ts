import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"; // Import the admin DB instance
import OpenAI from 'openai'; // Import OpenAI

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
                // Assume minutes if no unit specified after number
                totalMinutes += value;
            }
        }
    }
    // If parsing failed or resulted in 0, treat as Infinity to avoid filtering out valid long recipes
    return totalMinutes > 0 ? totalMinutes : Infinity;
};

// --- Function to call the AI model with fallback ---
async function getAICompletion(openrouter: OpenAI, prompt: string, primaryModel: string, fallbackModel: string): Promise<string | null> {
    try {
        console.log(`Attempting API call with primary model: ${primaryModel}`);
        const completion = await openrouter.chat.completions.create({
            model: primaryModel,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }, // Request JSON output
        });
        console.log(`Successfully completed call with ${primaryModel}`);
        return completion.choices[0].message?.content || null;
    } catch (primaryError: any) {
        console.warn(`Primary model (${primaryModel}) failed: ${primaryError.message}. Trying fallback: ${fallbackModel}`);

        // Check if the error is a rate limit error (status 429) or another potentially retryable server error (5xx)
        const status = primaryError?.status; // Access status safely
        if (status === 429 || (status && status >= 500)) {
             try {
                console.log(`Attempting API call with fallback model: ${fallbackModel}`);
                const fallbackCompletion = await openrouter.chat.completions.create({
                    model: fallbackModel,
                    messages: [{ role: "user", content: prompt }],
                    // IMPORTANT: Check if fallback model supports json_object format.
                    // If it causes errors, remove the line below for the fallback call.
                    response_format: { type: "json_object" },
                });
                 console.log(`Successfully completed call with ${fallbackModel}`);
                return fallbackCompletion.choices[0].message?.content || null;
            } catch (fallbackError: any) {
                console.error(`Fallback model (${fallbackModel}) also failed: ${fallbackError.message}`);
                // Throw a more specific error combining both failures
                throw new Error(`Primary model failed (${primaryError.message || 'Unknown primary error'}) and fallback model failed (${fallbackError.message || 'Unknown fallback error'})`);
            }
        } else {
            // Don't retry for other errors (e.g., bad request 400, auth 401/403, not found 404)
            console.error(`Primary model failed with non-retryable error (Status: ${status}): ${primaryError.message}`);
            throw primaryError; // Re-throw the original error
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

  let mealType = "Dinner"; // Default value

  try {
    const body = await request.json();
    const { userProfile } = body;
    // Basic validation for userProfile
    if (!userProfile || typeof userProfile !== 'object') {
        throw new Error("Invalid request body: userProfile is missing or not an object.");
    }
    mealType = body.mealType || mealType; // Use default if not provided
    let filteredDishes: any[] = [];
    let prompt = ""; // Initialize prompt variable

    try {
        // --- Step 1: Try to fetch and filter from Firestore ---
        console.log("Attempting to fetch recipes from Firestore...");
        let recipesQuery: FirebaseFirestore.Query = adminDb.collection("recipes");

        // Apply basic dietary filters (can be expanded)
        if (userProfile.dietaryRestrictions?.includes('Vegetarian')) {
            recipesQuery = recipesQuery.where('diet', '==', 'Vegetarian');
        } else if (userProfile.dietaryRestrictions?.includes('Vegan')) {
             recipesQuery = recipesQuery.where('diet', '==', 'Vegan'); // Assuming a 'Vegan' tag exists
        }
        // Add more dietary filters if needed based on your Firestore data structure

        recipesQuery = recipesQuery.limit(500); // Limit initial fetch size

        const recipesSnapshot = await recipesQuery.get();
        const dishDatabase = recipesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`Fetched ${dishDatabase.length} initial recipes from Firestore.`);

        if (dishDatabase.length === 0) {
            console.warn("No recipes found in initial Firestore query matching core preferences.");
        }

        // --- Client-Side Filtering ---
        filteredDishes = dishDatabase.filter((dish: any) => {
            const course = dish.course?.toLowerCase() || '';
            const mealTypeLower = mealType.toLowerCase();
            let mealTypeMatch = course.includes(mealTypeLower);
            if (!mealTypeMatch && (mealTypeLower === 'lunch' || mealTypeLower === 'dinner') && course.includes('main course')) mealTypeMatch = true;
            if (!mealTypeMatch && mealTypeLower === 'snacks' && (course.includes('snack') || course.includes('appetizer'))) mealTypeMatch = true;

            let maxCookingTime = Infinity;
            if (userProfile.cookingTime === "quick") maxCookingTime = 30;
            else if (userProfile.cookingTime === "moderate") maxCookingTime = 60;

            const prepTime = timeToMinutes(dish.prep_time);
            const cookTime = timeToMinutes(dish.cook_time);
            const totalCookTime = (prepTime === Infinity ? 0 : prepTime) + (cookTime === Infinity ? 0 : cookTime);
            // Time match logic: Allow if no limit, or if time is within limit (and > 0), or if time is unknown (0)
            const timeMatch = maxCookingTime === Infinity || (totalCookTime > 0 && totalCookTime <= maxCookingTime) || totalCookTime === 0;

            let allergyMatch = true;
            if (userProfile.allergies && dish.ingredients) {
                 const allergiesLower = userProfile.allergies.toLowerCase().split(',').map((a: string) => a.trim()).filter(Boolean);
                 // Ensure ingredients is treated as a string for searching
                 const ingredientsString = (Array.isArray(dish.ingredients) ? dish.ingredients.join(', ') : String(dish.ingredients)).toLowerCase();
                 if (allergiesLower.some((allergy: string) => ingredientsString.includes(allergy))) allergyMatch = false;
            }
            return mealTypeMatch && timeMatch && allergyMatch;
        });
        console.log(`Filtered down to ${filteredDishes.length} potential dishes.`);

        if (filteredDishes.length === 0) {
             // If filtering results in zero, directly trigger the fallback generation logic
             throw new Error("No recipes found after filtering. Triggering fallback generation.");
        }

        // --- Prompt using the database ---
        prompt = `
You are MyDishGenie, an expert Indian cuisine recommendation AI. Analyze the user profile and the provided filtered list of potential dishes. Your goal is to select the 3 BEST matches for the user for the specified meal type.

USER PROFILE:
- Name: ${userProfile.name || 'User'}
- Current Location: ${userProfile.currentLocation || 'Unknown'}
- Age: ${userProfile.age || 'Unknown'}
- Favorite Cuisines: ${(userProfile.favoriteCuisines || []).join(", ") || "None specified"}
- Dietary Restrictions: ${(userProfile.dietaryRestrictions || []).join(", ") || "None specified"}
- Spice Level Preference: ${userProfile.spiceLevel || 'medium'}
- Cooking Time Available: ${userProfile.cookingTime || 'any'}
- Family Size: ${userProfile.familySize || '1'}
- Allergies: ${userProfile.allergies || "None specified"}
- Additional Preferences: ${userProfile.additionalPreferences || "None specified"}
- Meal Type Required: ${mealType}

FILTERED DISHES (Potential Matches - select the best 3):
${JSON.stringify(filteredDishes.slice(0, 30), null, 2)}  // Limit context size for AI

INSTRUCTIONS:
1.  Carefully review the user profile and the list of filtered dishes.
2.  Select exactly 3 dishes from the provided list that are the most suitable based on ALL user preferences (cuisine, diet, spice, time, meal type, allergies, etc.).
3.  Prioritize dishes that strongly match the user's favorite cuisines and dietary needs.
4.  Consider the \`mealType\` requested (${mealType}) and the \`course\` field of the dishes.
5.  For each selected dish, provide a personalized "reason" explaining WHY it's a great fit for *this specific user*. Reference their profile details in your reasons (e.g., "Since you enjoy North Indian food and need a quick vegetarian meal...").
6.  Format the output as a valid JSON object containing a single key "recommendations" which holds an array of exactly 3 dish objects. Like this: { "recommendations": [ {dish1}, {dish2}, {dish3} ] }.
7.  Each dish object MUST have these exact keys: "id" (use the ID from the database), "name", "cuisine", "mealType", "cookingTime" (total prep + cook time string), "spiceLevel" (estimate if missing: mild, medium, hot), "difficulty" (estimate if missing: easy, medium, hard), "rating" (estimate 1-5 if missing), "description", "ingredients" (must be an array of strings), "instructions", "reason", "image_url" (use database value or placeholder).
8. Ensure ingredients are presented as a clean array of strings. Convert if necessary.

Respond ONLY with the valid JSON object { "recommendations": [...] }.
`;

    } catch (dbError: any) {
        console.warn("Firestore operation failed or insufficient results. Using database-free AI generation.", dbError.message);

        // --- Fallback Prompt without the database ---
        prompt = `
You are MyDishGenie, an expert Indian cuisine recommendation AI. Your primary recipe database is currently unavailable or returned no results.
Please generate 3 creative and delicious Indian recipe ideas from your own knowledge that perfectly match the user's profile for the specified meal type.

USER PROFILE:
- Name: ${userProfile.name || 'User'}
- Current Location: ${userProfile.currentLocation || 'Unknown'}
- Age: ${userProfile.age || 'Unknown'}
- Favorite Cuisines: ${(userProfile.favoriteCuisines || []).join(", ") || "None specified"}
- Dietary Restrictions: ${(userProfile.dietaryRestrictions || []).join(", ") || "None specified"}
- Spice Level Preference: ${userProfile.spiceLevel || 'medium'}
- Cooking Time Available: ${userProfile.cookingTime || 'any'}
- Family Size: ${userProfile.familySize || '1'}
- Allergies: ${userProfile.allergies || "None specified"}
- Additional Preferences: ${userProfile.additionalPreferences || "None specified"}
- Meal Type Required: ${mealType}


INSTRUCTIONS:
1.  Generate exactly 3 diverse Indian dishes that fit the user's profile and the requested meal type (${mealType}).
2.  Pay close attention to dietary restrictions, cooking time, spice level, and favorite cuisines.
3.  For each dish, provide a personalized "reason" explaining why it's suitable for this user, referencing their profile.
4.  Format the output as a valid JSON object containing a single key "recommendations" which holds an array of exactly 3 dish objects. Like this: { "recommendations": [ {dish1}, {dish2}, {dish3} ] }.
5.  Each dish object MUST have these exact keys:
    {
      "id": "generate-a-unique-id-based-on-dish-name", // e.g., "palak-paneer-quick"
      "name": "Recipe Name",
      "cuisine": "Specific Indian Cuisine (e.g., Punjabi, South Indian)",
      "mealType": "${mealType}", // Ensure this matches the requested meal type
      "cookingTime": "Estimated total time string (e.g., '30 minutes', '1 hour')", // Align with user's preference
      "spiceLevel": "e.g., mild, medium, hot", // Align with user's preference
      "difficulty": "e.g., easy, medium, hard",
      "rating": 4.5, // Assign a reasonable default rating (number)
      "description": "A short, appetizing description.",
      "ingredients": ["List", "of", "key", "ingredients", "as", "strings"],
      "instructions": "Clear, step-by-step cooking instructions.",
      "reason": "A personalized explanation referencing user profile details.",
      "image_url": "https://placehold.co/400x300/FFEDD5/8C2D0D?text=AI+Generated" // Placeholder URL
    }
6. Ensure the response contains ONLY the valid JSON object { "recommendations": [...] }.
`;
    }


    // --- Call the AI with the chosen prompt using the new function ---
    const openrouter = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        "HTTP-Referer": "https://mydishgenie.vercel.app", // YOUR SITE URL
        "X-Title": "MyDishGenie", // YOUR SITE NAME
      },
    });

    // Call the helper function with fallback logic
    const recommendationsText = await getAICompletion(openrouter, prompt, primaryModel, fallbackModel);

    if (!recommendationsText) {
        throw new Error("AI did not return any content after primary and fallback attempts.");
    }

    // --- Parse the JSON response ---
    let recommendations;
    try {
        console.log("Raw AI Response:", recommendationsText); // Log raw response
        const parsedJson = JSON.parse(recommendationsText);

        // Expect structure like { "recommendations": [...] }
        if (parsedJson && Array.isArray(parsedJson.recommendations)) {
            recommendations = parsedJson.recommendations;
        }
         // Handle case where AI might just return the array directly (less likely with prompt)
        else if (Array.isArray(parsedJson)) {
             console.warn("AI returned a direct array instead of the expected { recommendations: [...] } object.");
             recommendations = parsedJson;
        }
        else {
            console.error("Parsed JSON object does not contain 'recommendations' array:", parsedJson);
            throw new Error("Parsed JSON object does not contain a 'recommendations' array key.");
        }

        // Basic validation
        if (!Array.isArray(recommendations) || recommendations.length === 0 || typeof recommendations[0] !== 'object' || !recommendations[0].name) {
             console.error("Parsed recommendations array structure is invalid:", recommendations);
             throw new Error("AI response format is invalid after parsing.");
        }

        // --- Data Cleaning/Transformation (Optional but Recommended) ---
        recommendations = recommendations.map(dish => ({
            ...dish,
            // Ensure ingredients is an array
            ingredients: Array.isArray(dish.ingredients)
                ? dish.ingredients
                : typeof dish.ingredients === 'string'
                    ? dish.ingredients.split(',').map(s => s.trim()).filter(Boolean)
                    : [], // Default to empty array if unexpected type
            // Add defaults for potentially missing fields if needed
            rating: typeof dish.rating === 'number' ? dish.rating : 4.0,
            difficulty: dish.difficulty || 'medium',
            spiceLevel: dish.spiceLevel || 'medium',
            image_url: dish.image_url || 'https://placehold.co/400x300/FFEDD5/8C2D0D?text=No+Image'
        }));


    } catch (parseError: any) {
        console.error("Failed to parse AI response JSON:", recommendationsText); // Log raw response on error
        throw new Error(`Failed to parse AI response: ${parseError.message}.`);
    }

    console.log(`Successfully generated ${recommendations.length} recommendations.`);
    return NextResponse.json(recommendations);

  } catch (error: any) {
    // Catch errors from anywhere in the process (DB, AI call, parsing)
    console.error("Error in /api/recommend POST handler:", error);
    const errorMessage = error.message || "An unknown error occurred";
    // Log the error stack for more details in Vercel logs
    console.error(error.stack);
    return NextResponse.json({
        error: "Failed to generate recommendations.",
        details: errorMessage
        // Avoid sending full stack to client in production for security
        // source: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}