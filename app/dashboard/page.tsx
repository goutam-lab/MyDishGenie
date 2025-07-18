"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ChefHat, Clock, MapPin, Sparkles, RefreshCw, Star, Users, Utensils, LogOut, AlertCircle, Soup } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import AIChefBot from "@/components/AIChefBot" // Import the new component

// --- Firebase Imports ---
import { useAuth } from "@/context/AuthContext"
import { db, auth } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { signOut } from "firebase/auth"

// --- Type Definitions ---
interface UserProfile {
  name: string
  birth_place: string
  current_location: string
  age: number
  favorite_cuisines: string[]
  dietary_restrictions: string[]
  spice_level: string
  cooking_time: string
  family_size: string
  allergies?: string
  additional_preferences?: string
}

interface DishRecommendation {
  id: string
  name: string
  cuisine: string
  mealType: string
  cookingTime: string
  spiceLevel: string
  difficulty: string
  rating: number
  description: string
  ingredients: string[] | string // Can be an array or a string
  reason: string
  image_url?: string // Image is now optional
  instructions?: string
}

// --- Helper Function to get Meal Type ---
const getMealType = () => {
    const now = new Date();
    const hour = now.getHours();
    if (hour >= 6 && hour < 11) return "Breakfast";
    if (hour >= 11 && hour < 16) return "Lunch";
    if (hour >= 16 && hour < 20) return "Snacks";
    return "Dinner";
};

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [currentMealType, setCurrentMealType] = useState(getMealType())
  const [recommendations, setRecommendations] = useState<DishRecommendation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // State for the recipe modal
  const [selectedDish, setSelectedDish] = useState<DishRecommendation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/auth/login")
        return
      }

      const loadProfileAndRecommendations = async () => {
        const profileDocRef = doc(db, "user_profiles", user.uid)
        const profileDoc = await getDoc(profileDocRef)

        if (!profileDoc.exists()) {
          router.push("/onboarding")
          return
        }

        const profileData = profileDoc.data() as UserProfile
        setUserProfile(profileData)
        
        const mealType = getMealType();
        setCurrentMealType(mealType);

        await getAIRecommendation(profileData, mealType)
      }

      loadProfileAndRecommendations()
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentMealType(getMealType());
    }, 60000); 

    return () => clearInterval(intervalId);
  }, []);


  const getAIRecommendation = async (profile?: UserProfile, mealType?: string) => {
    const profileToUse = profile || userProfile
    const mealTypeToUse = mealType || currentMealType
    
    if (!profileToUse) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userProfile: {
            name: profileToUse.name,
            birthPlace: profileToUse.birth_place,
            currentLocation: profileToUse.current_location,
            age: profileToUse.age.toString(),
            favoriteCuisines: profileToUse.favorite_cuisines,
            dietaryRestrictions: profileToUse.dietary_restrictions,
            spiceLevel: profileToUse.spice_level,
            cookingTime: profileToUse.cooking_time,
            familySize: profileToUse.family_size,
            allergies: profileToUse.allergies || "",
            additionalPreferences: profileToUse.additional_preferences || "",
          },
          mealType: mealTypeToUse,
          currentTime: new Date().toISOString(),
        }),
      })

      if (response.ok) {
        const newRecommendations = await response.json()
        setRecommendations(newRecommendations)
      } else {
        const errorData = await response.json();
        const errorMessage = `Failed to fetch recommendations. Server said: ${errorData.error || response.statusText}`;
        setError(errorMessage);
        console.error(errorMessage, errorData.details);
      }
    } catch (error) {
      const errorMessage = "An unexpected error occurred while fetching recommendations.";
      setError(errorMessage);
      console.error(errorMessage, error);
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut(auth)
    router.push("/")
  }

  const handleViewRecipe = (dish: DishRecommendation) => {
    setSelectedDish(dish);
    setIsModalOpen(true);
  }

  if (authLoading || !userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-red-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-red-50">
        {/* Header */}
        <header className="container mx-auto px-4 py-6">
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ChefHat className="h-8 w-8 text-orange-600" />
              <span className="text-2xl font-bold text-gray-800">MyDishGenie</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600 hidden sm:inline">Welcome, {userProfile.name}!</span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </nav>
        </header>

        <main className="container mx-auto px-4 py-8">
          {/* Current Status Cards */}
          <motion.div 
            className="grid md:grid-cols-3 gap-6 mb-8"
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.1 } }
            }}
          >
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
              <Card>
                <CardContent className="pt-6 flex items-center space-x-4">
                  <div className="bg-orange-100 p-3 rounded-full">
                    <Clock className="h-8 w-8 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Current Meal Time</p>
                    <p className="text-xl font-semibold">{currentMealType}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
              <Card>
                <CardContent className="pt-6 flex items-center space-x-4">
                  <div className="bg-orange-100 p-3 rounded-full">
                    <MapPin className="h-8 w-8 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Your Location</p>
                    <p className="text-xl font-semibold">{userProfile.current_location}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
              <Card>
                <CardContent className="pt-6 flex items-center space-x-4">
                  <div className="bg-orange-100 p-3 rounded-full">
                    <Users className="h-8 w-8 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cooking For</p>
                    <p className="text-xl font-semibold">{userProfile.family_size} people</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* AI Recommendations Section */}
          <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 sm:mb-0">AI Recommendations for {currentMealType}</h2>
            <Button onClick={() => getAIRecommendation()} disabled={isLoading} className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto">
              {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Get New Suggestions
            </Button>
          </div>

          {/* New Error Alert */}
          {error && (
              <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
              </Alert>
          )}

          {/* Recommendations Grid */}
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6">
                    <div className="h-6 bg-gray-200 rounded mb-4 w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2 w-1/2"></div>
                    <div className="h-16 bg-gray-200 rounded mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded w-full"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !error && (
            <motion.div 
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.1 } }
              }}
            >
              {recommendations.map((dish) => (
                <motion.div
                  key={dish.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                >
                  <Card className="hover:shadow-xl transition-shadow h-full flex flex-col">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="bg-orange-100 p-3 rounded-full">
                                <Soup className="h-6 w-6 text-orange-600" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">{dish.name}</CardTitle>
                                <p className="text-sm text-gray-600">{dish.cuisine}</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-1 text-sm">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{dish.rating}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-grow flex flex-col">
                      <p className="text-gray-600 mb-4 text-sm flex-grow">{dish.description}</p>
                      <div className="bg-orange-50 p-3 rounded-lg mb-4">
                        <p className="text-sm text-orange-800"><strong>Why this dish?</strong> {dish.reason}</p>
                      </div>
                      <Button 
                        className="w-full bg-orange-600 hover:bg-orange-700 mt-auto"
                        onClick={() => handleViewRecipe(dish)}
                      >
                        View Recipe
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
          
          {/* AI Chef Bot Component */}
          <AIChefBot />

        </main>
      </div>

      {/* Recipe Detail Modal */}
      <AnimatePresence>
        {isModalOpen && selectedDish && (
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">{selectedDish.name}</DialogTitle>
                <DialogDescription>{selectedDish.description}</DialogDescription>
              </DialogHeader>
              <div className="mt-4 max-h-[60vh] overflow-y-auto pr-4">
                <div>
                  <h3 className="font-bold mb-2 text-lg">Key Ingredients</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    {(Array.isArray(selectedDish.ingredients) 
                        ? selectedDish.ingredients 
                        : selectedDish.ingredients.split(',').map(s => s.trim())
                    ).map((ing, i) => <li key={i}>{ing}</li>)}
                  </ul>
                </div>
                <div className="mt-4">
                  <h3 className="font-bold mb-2 text-lg">Instructions</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {selectedDish.instructions || "No instructions provided."}
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  )
}