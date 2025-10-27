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

        // --- Improved Filtering Logic ---
        // Basic dietary filter (can be expanded)
        if (userProfile.dietaryRestrictions?.includes('Vegetarian')) {
            recipesQuery = recipesQuery.where('diet', '==', 'Vegetarian');
        } else if (userProfile.dietaryRestrictions?.includes('Vegan')) {
             recipesQuery = recipesQuery.where('diet', '==', 'Vegan'); // Assuming you have a 'Vegan' diet tag
        }
        // Add more specific filters based on diet if needed

        // Fetch a larger initial set if possible, or adjust based on performance
        recipesQuery = recipesQuery.limit(500); // Keep limit reasonable

        const recipesSnapshot = await recipesQuery.get();
        const dishDatabase = recipesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); // Include doc ID

        if (dishDatabase.length === 0) {
            console.warn("No recipes found in initial Firestore query matching core preferences.");
            // Consider broadening the initial query or falling back immediately
        }

        // --- More Robust Client-Side Filtering ---
        filteredDishes = dishDatabase.filter((dish: any) => {
            // Meal Type Check (more flexible)
            const course = dish.course?.toLowerCase() || '';
            const mealTypeLower = mealType.toLowerCase();
            let mealTypeMatch = course.includes(mealTypeLower);
            // Handle broader categories (e.g., 'main course' for lunch/dinner)
            if (!mealTypeMatch && (mealTypeLower === 'lunch' || mealTypeLower === 'dinner') && course.includes('main course')) {
                mealTypeMatch = true;
            }
             if (!mealTypeMatch && mealTypeLower === 'snacks' && (course.includes('snack') || course.includes('appetizer'))) {
                 mealTypeMatch = true;
            }


            // Cooking Time Check
            let maxCookingTime = Infinity;
            if (userProfile.cookingTime === "quick") maxCookingTime = 30;
            else if (userProfile.cookingTime === "moderate") maxCookingTime = 60;
            // userProfile.cookingTime === "elaborate" or "any" means no time limit (Infinity)

            const prepTime = timeToMinutes(dish.prep_time);
            const cookTime = timeToMinutes(dish.cook_time);
            // Handle cases where one time is missing
            const totalCookTime = (prepTime === Infinity ? 0 : prepTime) + (cookTime === Infinity ? 0 : cookTime);
            // Ensure we don't filter out recipes with missing time unless a strict limit is set
            const timeMatch = maxCookingTime === Infinity || totalCookTime <= maxCookingTime;


            // Cuisine Preference (Optional enhancement: Check if dish cuisine is in user's favorites)
            // let cuisineMatch = !userProfile.favoriteCuisines || userProfile.favoriteCuisines.length === 0 || userProfile.favoriteCuisines.some((favCuisine: string) => dish.cuisine?.toLowerCase().includes(favCuisine.toLowerCase()));


            // Basic Allergy Check (Simple string check, enhance as needed)
            let allergyMatch = true;
            if (userProfile.allergies && dish.ingredients) {
                 const allergiesLower = userProfile.allergies.toLowerCase().split(',').map((a: string) => a.trim()).filter(Boolean);
                 const ingredientsString = (Array.isArray(dish.ingredients) ? dish.ingredients.join(', ') : dish.ingredients).toLowerCase();
                 if (allergiesLower.some((allergy: string) => ingredientsString.includes(allergy))) {
                     allergyMatch = false;
                 }
            }


            // Combine filters
            return mealTypeMatch && timeMatch && allergyMatch; // Add cuisineMatch if implementing
        });

        if (filteredDishes.length < 3) {
             console.warn(`Only found ${filteredDishes.length} dishes after filtering. May need fallback.`);
             // Consider triggering fallback immediately if count is too low
             if (filteredDishes.length === 0) {
                 throw new Error("No recipes found after filtering. Triggering fallback.");
             }
        }


        // --- Prompt using the database ---
        prompt = `
        You are MyDishGenie, an expert Indian cuisine recommendation AI. Analyze the user profile and the provided filtered list of potential dishes. Your goal is to select the 3 BEST matches for the user for the specified meal type.

        USER PROFILE:
        - Name: ${userProfile.name}
        - Current Location: ${userProfile.currentLocation}
        - Age: ${userProfile.age}
        - Favorite Cuisines: ${(userProfile.favoriteCuisines || []).join(", ") || "None specified"}
        - Dietary Restrictions: ${(userProfile.dietaryRestrictions || []).join(", ") || "None specified"}
        - Spice Level Preference: ${userProfile.spiceLevel}
        - Cooking Time Available: ${userProfile.cookingTime}
        - Family Size: ${userProfile.familySize}
        - Allergies: ${userProfile.allergies || "None specified"}
        - Additional Preferences: ${userProfile.additionalPreferences || "None specified"}
        - Meal Type Required: ${mealType}

        FILTERED DISHES (Potential Matches - select the best 3):
        ${JSON.stringify(filteredDishes.slice(0, 30), null, 2)}  // Limit context size for the AI

        INSTRUCTIONS:
        1.  Carefully review the user profile and the list of filtered dishes.
        2.  Select exactly 3 dishes from the provided list that are the most suitable based on ALL user preferences (cuisine, diet, spice, time, meal type, allergies, etc.).
        3.  Prioritize dishes that strongly match the user's favorite cuisines and dietary needs.
        4.  Consider the `mealType` requested (${mealType}) and the `course` field of the dishes.
        5.  For each selected dish, provide a personalized "reason" explaining WHY it's a great fit for *this specific user*. Reference their profile details in your reasons (e.g., "Since you enjoy North Indian food and need a quick vegetarian meal...").
        6.  Format the output as a valid JSON array containing exactly 3 objects.
        7.  Each object MUST have these exact keys: "id", "name", "cuisine", "mealType", "cookingTime", "spiceLevel", "difficulty", "rating", "description", "ingredients" (must be an array of strings), "instructions", "reason", "image_url" (use the one from the database if available, otherwise provide a placeholder or omit).
        8.  Estimate "difficulty" (easy, medium, hard) and "rating" (1-5) if not present in the data, based on the recipe. Assign a sensible default spice level if missing. Ensure cookingTime reflects prep + cook time.

        Respond ONLY with the JSON array.
        `;

    } catch (dbError: any) {
        console.warn("Firestore operation failed or insufficient results. Switching to database-free AI generation.", dbError.message);

        // --- Fallback Prompt without the database ---
        prompt = `
        You are MyDishGenie, an expert Indian cuisine recommendation AI. Your primary recipe database is currently unavailable or returned too few results.
        Please generate 3 creative and delicious Indian recipe ideas from your own knowledge that perfectly match the user's profile for the specified meal type.

        USER PROFILE:
        - Name: ${userProfile.name}
        - Current Location: ${userProfile.currentLocation}
        - Age: ${userProfile.age}
        - Favorite Cuisines: ${(userProfile.favoriteCuisines || []).join(", ") || "None specified"}
        - Dietary Restrictions: ${(userProfile.dietaryRestrictions || []).join(", ") || "None specified"}
        - Spice Level Preference: ${userProfile.spiceLevel}
        - Cooking Time Available: ${userProfile.cookingTime}
        - Family Size: ${userProfile.familySize}
        - Allergies: ${userProfile.allergies || "None specified"}
        - Additional Preferences: ${userProfile.additionalPreferences || "None specified"}
        - Meal Type Required: ${mealType}


        INSTRUCTIONS:
        1.  Generate exactly 3 diverse Indian dishes that fit the user's profile and the requested meal type (${mealType}).
        2.  Pay close attention to dietary restrictions, cooking time, spice level, and favorite cuisines.
        3.  For each dish, provide a personalized "reason" explaining why it's suitable for this user, referencing their profile.
        4.  Format the output as a valid JSON array containing exactly 3 objects.
        5.  Each object MUST have these exact keys:
            {
              "id": "generate-a-unique-id-based-on-dish-name", // e.g., "palak-paneer-quick"
              "name": "Recipe Name",
              "cuisine": "Specific Indian Cuisine (e.g., Punjabi, South Indian)",
              "mealType": "${mealType}", // Ensure this matches the requested meal type
              "cookingTime": "Estimated total time (e.g., '30 minutes', '1 hour')", // Align with user's preference
              "spiceLevel": "e.g., mild, medium, hot", // Align with user's preference
              "difficulty": "e.g., easy, medium, hard",
              "rating": 4.5, // Assign a reasonable default rating
              "description": "A short, appetizing description.",
              "ingredients": ["List", "of", "key", "ingredients", "as", "strings"],
              "instructions": "Clear, step-by-step cooking instructions.",
              "reason": "A personalized explanation referencing user profile details.",
              "image_url": "https://placehold.co/400x300/FFEDD5/8C2D0D?text=AI+Generated" // Placeholder URL
            }
        6.  Ensure the response contains ONLY the valid JSON array.
        `;
    }


    // --- Call the AI with the chosen prompt ---
     // Initialize the OpenAI client configured for OpenRouter
    const openrouter = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: { // Add these headers
        "HTTP-Referer": "https://mydishgenie.vercel.app", // Replace with your actual deployed URL
        "X-Title": "MyDishGenie", // Replace with your App Name
      },
    });


    try {
        const completion = await openrouter.chat.completions.create({
            // ** CHANGE MODEL NAME HERE **
            model: "google/gemini-pro-1.5:free", // Use a known working or free model like gemini-pro-1.5 or check OpenRouter docs
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }, // Request JSON output if model supports it
        });

        const recommendationsText = completion.choices[0].message?.content;

        if (!recommendationsText) {
            throw new Error("AI did not return any content.");
        }

        // Attempt to parse the JSON
        let recommendations;
        try {
            const parsedJson = JSON.parse(recommendationsText);
            // The model might return {"recommendations": [...] } or just [...]
             if (Array.isArray(parsedJson)) {
                recommendations = parsedJson;
            } else if (typeof parsedJson === 'object' && parsedJson !== null) {
                 // Find the key that holds the array (common practice)
                const arrayKey = Object.keys(parsedJson).find(key => Array.isArray(parsedJson[key]));
                if (arrayKey) {
                    recommendations = parsedJson[arrayKey];
                } else {
                     throw new Error("Parsed JSON object does not contain an array of recommendations.");
                }
            } else {
                 throw new Error("Parsed JSON response is not an array or a valid object structure.");
            }

            // Basic validation of the result structure (optional but recommended)
            if (!Array.isArray(recommendations) || recommendations.length === 0 || typeof recommendations[0] !== 'object' || !recommendations[0].name) {
                 console.error("Parsed recommendations array is invalid:", recommendations);
                 throw new Error("AI response did not follow the expected format.");
            }


        } catch (parseError: any) {
            console.error("Failed to parse AI response JSON:", recommendationsText);
            throw new Error(`Failed to parse AI response: ${parseError.message}`);
        }

        return NextResponse.json(recommendations);

     } catch (aiError: any) {
        console.error("Error calling OpenRouter API:", aiError);
         // Check for specific API error details if available
        const details = aiError.response?.data?.error?.message || aiError.message;
        throw new Error(`AI API call failed: ${details}`);
     }


  } catch (error: any) {
    console.error("Error in /api/recommend:", error);
    // Provide more context in the error response
    return NextResponse.json({ error: "Failed to generate recommendations.", details: error.message, source: error.stack }, { status: 500 });
  }
}