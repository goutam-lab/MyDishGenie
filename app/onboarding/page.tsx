"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ChefHat, ArrowRight, MapPin, Heart, Clock, Utensils, LogOut } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

// --- Firebase Imports ---
import { useAuth } from "@/context/AuthContext"
import { db, auth } from "@/lib/firebase"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { signOut } from "firebase/auth"

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
]

const cuisineTypes = [
  "North Indian", "South Indian", "Bengali", "Gujarati", "Punjabi", "Rajasthani", "Maharashtrian", "Tamil", "Kerala", "Hyderabadi", "Kashmiri", "Goan",
]

const dietaryPreferences = [
  { id: "vegetarian", label: "Vegetarian" }, { id: "vegan", label: "Vegan" }, { id: "jain", label: "Jain Food" }, { id: "gluten-free", label: "Gluten Free" }, { id: "dairy-free", label: "Dairy Free" }, { id: "low-spice", label: "Low Spice" }, { id: "high-protein", label: "High Protein" },
]

// Animation Variants
const stepVariants = {
  hidden: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 200 : -200,
  }),
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction < 0 ? 200 : -200,
    transition: { duration: 0.4, ease: "easeIn" },
  }),
};


export default function OnboardingPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1);
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  
  const [formData, setFormData] = useState({
    name: "",
    birthPlace: "",
    currentLocation: "",
    age: "",
    favoriteCuisines: [] as string[],
    dietaryRestrictions: [] as string[],
    spiceLevel: "",
    cookingTime: "",
    familySize: "",
    allergies: "",
    additionalPreferences: "",
  })

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/auth/login")
      } else {
        setFormData(prev => ({ ...prev, name: user.displayName || "" }))
        const checkProfile = async () => {
          const profileDocRef = doc(db, "user_profiles", user.uid);
          const profileDoc = await getDoc(profileDocRef);
          if (profileDoc.exists()) {
            router.push("/dashboard");
          }
        };
        checkProfile();
      }
    }
  }, [user, loading, router])

  const handleNext = async () => {
    setDirection(1);
    if (step < 4) {
      setStep(step + 1)
    } else {
      await saveProfile()
    }
  }
  
  const handlePrevious = () => {
    setDirection(-1);
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const saveProfile = async () => {
    if (!user) return

    setIsLoading(true)
    setError("")

    try {
      const profileDocRef = doc(db, "user_profiles", user.uid);
      await setDoc(profileDocRef, {
        name: formData.name,
        email: user.email,
        birth_place: formData.birthPlace,
        current_location: formData.currentLocation,
        age: Number.parseInt(formData.age),
        favorite_cuisines: formData.favoriteCuisines,
        dietary_restrictions: formData.dietaryRestrictions,
        spice_level: formData.spiceLevel,
        cooking_time: formData.cookingTime,
        family_size: formData.familySize,
        allergies: formData.allergies,
        additional_preferences: formData.additionalPreferences,
        createdAt: new Date(),
      });

      router.push("/dashboard")
    } catch (err: any) {
      setError("Failed to save profile. Please try again. Error: " + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/");
  };

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item) ? array.filter((i) => i !== item) : [...array, item]
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-red-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-red-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ChefHat className="h-8 w-8 text-orange-600" />
            <span className="text-2xl font-bold text-gray-800">MyDishGenie</span>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Step {step} of 4</span>
              <span className="text-sm text-gray-600">{Math.round((step / 4) * 100)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-orange-600 h-2 rounded-full"
                initial={{ width: `${((step - 1) / 4) * 100}%` }}
                animate={{ width: `${(step / 4) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            </div>
          </div>

          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <Card className="overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    {step === 1 && (<><MapPin className="h-5 w-5 text-orange-600" /><span>Tell Us About Yourself</span></>)}
                    {step === 2 && (<><Heart className="h-5 w-5 text-orange-600" /><span>Your Food Preferences</span></>)}
                    {step === 3 && (<><Utensils className="h-5 w-5 text-orange-600" /><span>Dietary Requirements</span></>)}
                    {step === 4 && (<><Clock className="h-5 w-5 text-orange-600" /><span>Cooking Preferences</span></>)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {step === 1 && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="name">Your Name</Label>
                        <Input
                          id="name"
                          placeholder="Enter your name"
                          value={formData.name}
                          onChange={(e) => updateFormData("name", e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="birthPlace">Where were you born?</Label>
                        <Select onValueChange={(value) => updateFormData("birthPlace", value)} required>
                          <SelectTrigger><SelectValue placeholder="Select your birth state" /></SelectTrigger>
                          <SelectContent>
                            {indianStates.map((state) => (<SelectItem key={state} value={state}>{state}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currentLocation">Where do you live now?</Label>
                        <Select onValueChange={(value) => updateFormData("currentLocation", value)} required>
                          <SelectTrigger><SelectValue placeholder="Select your current state" /></SelectTrigger>
                          <SelectContent>
                            {indianStates.map((state) => (<SelectItem key={state} value={state}>{state}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="age">Your Age</Label>
                        <Input
                          id="age"
                          type="number"
                          placeholder="Enter your age"
                          value={formData.age}
                          onChange={(e) => updateFormData("age", e.target.value)}
                          required
                        />
                      </div>
                    </>
                  )}
                  {step === 2 && (
                    <>
                      <div className="space-y-3">
                        <Label>Which cuisines do you love? (Select multiple)</Label>
                        <div className="grid grid-cols-2 gap-3">
                          {cuisineTypes.map((cuisine) => (
                            <div key={cuisine} className="flex items-center space-x-2">
                              <Checkbox
                                id={cuisine}
                                checked={formData.favoriteCuisines.includes(cuisine)}
                                onCheckedChange={() =>
                                  updateFormData("favoriteCuisines", toggleArrayItem(formData.favoriteCuisines, cuisine))
                                }
                              />
                              <Label htmlFor={cuisine} className="text-sm">{cuisine}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="spiceLevel">How much spice can you handle?</Label>
                        <Select onValueChange={(value) => updateFormData("spiceLevel", value)} required>
                          <SelectTrigger><SelectValue placeholder="Select spice level" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mild">Mild - I prefer less spicy food</SelectItem>
                            <SelectItem value="medium">Medium - I enjoy moderate spice</SelectItem>
                            <SelectItem value="hot">Hot - I love spicy food</SelectItem>
                            <SelectItem value="extra-hot">Extra Hot - Bring on the heat!</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                  {step === 3 && (
                     <>
                      <div className="space-y-3">
                        <Label>Any dietary restrictions or preferences?</Label>
                        <div className="grid grid-cols-2 gap-3">
                          {dietaryPreferences.map((pref) => (
                            <div key={pref.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={pref.id}
                                checked={formData.dietaryRestrictions.includes(pref.id)}
                                onCheckedChange={() =>
                                  updateFormData("dietaryRestrictions", toggleArrayItem(formData.dietaryRestrictions, pref.id))
                                }
                              />
                              <Label htmlFor={pref.id} className="text-sm">{pref.label}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="allergies">Any food allergies?</Label>
                        <Textarea
                          id="allergies"
                          placeholder="List any food allergies or ingredients to avoid"
                          value={formData.allergies}
                          onChange={(e) => updateFormData("allergies", e.target.value)}
                        />
                      </div>
                    </>
                  )}
                  {step === 4 && (
                     <>
                      <div className="space-y-2">
                        <Label htmlFor="cookingTime">How much time do you usually have for cooking?</Label>
                        <Select onValueChange={(value) => updateFormData("cookingTime", value)} required>
                          <SelectTrigger><SelectValue placeholder="Select cooking time preference" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="quick">Quick (15-30 minutes)</SelectItem>
                            <SelectItem value="moderate">Moderate (30-60 minutes)</SelectItem>
                            <SelectItem value="elaborate">Elaborate (1+ hours)</SelectItem>
                            <SelectItem value="any">Any - I'm flexible</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="familySize">How many people do you usually cook for?</Label>
                        <Select onValueChange={(value) => updateFormData("familySize", value)} required>
                          <SelectTrigger><SelectValue placeholder="Select family size" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Just me</SelectItem>
                            <SelectItem value="2">2 people</SelectItem>
                            <SelectItem value="3-4">3-4 people</SelectItem>
                            <SelectItem value="5+">5+ people</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="additionalPreferences">Any other preferences?</Label>
                        <Textarea
                          id="additionalPreferences"
                          placeholder="Tell us anything else that might help us suggest better dishes for you"
                          value={formData.additionalPreferences}
                          onChange={(e) => updateFormData("additionalPreferences", e.target.value)}
                        />
                      </div>
                    </>
                  )}
                  <div className="flex justify-between pt-6">
                    <Button variant="outline" onClick={handlePrevious} disabled={step === 1}>Previous</Button>
                    <Button onClick={handleNext} className="bg-orange-600 hover:bg-orange-700" disabled={isLoading}>
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Saving...</span>
                        </div>
                      ) : (
                        <>
                          {step === 4 ? "Complete Setup" : "Next"}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </motion.div>
            </AnimatePresence>
          </Card>
        </div>
      </div>
    </div>
  )
}