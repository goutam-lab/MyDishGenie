"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ChefHat, Key, CheckCircle, AlertCircle, ExternalLink, Copy } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"

export default function SetupPage() {
  const [apiKeyStatus, setApiKeyStatus] = useState<"checking" | "found" | "missing">("checking")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Check if API key is configured (this would be done server-side in real app)
    // For demo purposes, we'll simulate the check
    setTimeout(() => {
      setApiKeyStatus("missing") // Change to 'found' if API key exists
    }, 1000)
  }, [])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const envVarExample = `# Add this to your environment variables
OPENAI_API_KEY=sk-your-openai-api-key-here`

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-red-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <ChefHat className="h-8 w-8 text-orange-600" />
            <span className="text-2xl font-bold text-gray-800">MyDishGenie</span>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </nav>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Setup AI-Powered Recommendations</h1>
            <p className="text-gray-600 text-lg">
              Configure your OpenAI API key to unlock personalized dish recommendations
            </p>
          </div>

          {/* Status Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="h-5 w-5 text-orange-600" />
                <span>API Key Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {apiKeyStatus === "checking" && (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                  <span>Checking configuration...</span>
                </div>
              )}

              {apiKeyStatus === "found" && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>OpenAI API Key Configured!</strong> AI-powered recommendations are active.
                  </AlertDescription>
                </Alert>
              )}

              {apiKeyStatus === "missing" && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    <strong>OpenAI API Key Missing.</strong> Using fallback recommendations. Follow the setup guide
                    below to enable AI features.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Setup Guide */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Step 1: Get API Key */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Badge className="bg-orange-600">1</Badge>
                  <span>Get OpenAI API Key</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  First, you'll need to get an API key from OpenAI to enable AI-powered recommendations.
                </p>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Visit OpenAI Platform</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Create account or sign in</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Navigate to API Keys section</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Create new API key</span>
                  </div>
                </div>

                <Button className="w-full bg-orange-600 hover:bg-orange-700" asChild>
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Get OpenAI API Key
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Step 2: Configure Environment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Badge className="bg-orange-600">2</Badge>
                  <span>Configure Environment</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">Add your OpenAI API key to your environment variables.</p>

                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm font-mono relative">
                  <pre>{envVarExample}</pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 text-gray-400 hover:text-white"
                    onClick={() => copyToClipboard(envVarExample)}
                  >
                    {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Security Note:</strong> Never commit API keys to version control. Use environment variables
                    or secure secret management.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          {/* Features Unlocked */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ChefHat className="h-5 w-5 text-orange-600" />
                <span>AI Features You'll Unlock</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-orange-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <span className="text-orange-600 font-bold">🧠</span>
                  </div>
                  <h3 className="font-semibold mb-2">Smart Analysis</h3>
                  <p className="text-sm text-gray-600">
                    AI analyzes your complete profile, preferences, and current context
                  </p>
                </div>

                <div className="text-center">
                  <div className="bg-orange-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <span className="text-orange-600 font-bold">🎯</span>
                  </div>
                  <h3 className="font-semibold mb-2">Personalized Reasons</h3>
                  <p className="text-sm text-gray-600">
                    Get detailed explanations for why each dish is perfect for you
                  </p>
                </div>

                <div className="text-center">
                  <div className="bg-orange-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <span className="text-orange-600 font-bold">🔄</span>
                  </div>
                  <h3 className="font-semibold mb-2">Dynamic Suggestions</h3>
                  <p className="text-sm text-gray-600">
                    Fresh recommendations that adapt to time, mood, and preferences
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Button */}
          <div className="text-center mt-8">
            <Link href="/dashboard">
              <Button size="lg" className="bg-orange-600 hover:bg-orange-700">
                {apiKeyStatus === "found" ? "Test AI Recommendations" : "Continue with Fallback Mode"}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
