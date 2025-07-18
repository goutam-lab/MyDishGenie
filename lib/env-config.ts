// Environment configuration for MyDishGenie
// This file helps validate and configure environment variables

interface EnvConfig {
  openaiApiKey: string | undefined
  nodeEnv: string
  isProduction: boolean
  isDevelopment: boolean
}

function getEnvConfig(): EnvConfig {
  const openaiApiKey = process.env.OPENAI_API_KEY
  const nodeEnv = process.env.NODE_ENV || "development"

  return {
    openaiApiKey,
    nodeEnv,
    isProduction: nodeEnv === "production",
    isDevelopment: nodeEnv === "development",
  }
}

export const envConfig = getEnvConfig()

// Validation function to check if required environment variables are set
export function validateEnvConfig(): { isValid: boolean; missingVars: string[] } {
  const missingVars: string[] = []

  if (!envConfig.openaiApiKey) {
    missingVars.push("OPENAI_API_KEY")
  }

  return {
    isValid: missingVars.length === 0,
    missingVars,
  }
}

// Helper function to get OpenAI API key with fallback
export function getOpenAIApiKey(): string {
  const apiKey = envConfig.openaiApiKey

  if (!apiKey) {
    console.warn("⚠️  OPENAI_API_KEY not found. AI recommendations will use fallback data.")
    return ""
  }

  return apiKey
}
