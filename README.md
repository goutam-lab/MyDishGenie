MyDishGenie: AI-Powered Indian Recipe Suggester 🍽️✨
MyDishGenie is a smart, interactive web application designed to solve the age-old question: "What should I cook today?" Built with a modern tech stack, this app provides users with personalized Indian recipe recommendations based on their unique taste profile, dietary needs, and location.

The app features a beautiful, animated landing page, a seamless user onboarding flow, and a dynamic dashboard where users can get instant suggestions from an AI chef and even chat with an AI assistant for cooking tips.

🚀 Features
AI-Powered Recommendations: Utilizes the Gemini API to provide three unique and personalized dish suggestions based on a user's detailed profile.

Personalized User Profiles: A multi-step onboarding process captures user preferences, including favorite cuisines, dietary restrictions, spice tolerance, and more.

Dynamic Dashboard: A central hub for logged-in users to view their current mealtime, location, and get new AI suggestions on demand.

Interactive AI Chef Bot: A floating chatbot powered by the Gemini API that can answer user questions about recipes, ingredients, and cooking techniques.

Secure Authentication: Full email/password and Google sign-in functionality handled securely by Firebase Authentication.

Firestore Database: All user profiles and recipe data are stored and managed in a scalable Firestore database.

Beautiful, Animated UI: Built with Tailwind CSS and Framer Motion to provide a smooth, modern, and fully responsive user experience.

Smooth Scrolling: Enhanced with Lenis for a premium, fluid scrolling experience.

🛠️ Tech Stack
Framework: Next.js (with App Router)

Styling: Tailwind CSS

UI Components: shadcn/ui

Animations: Framer Motion

Smooth Scrolling: Lenis

Backend & Authentication: Firebase (Authentication & Firestore)

AI / Language Model: Google Gemini API

Deployment: Vercel

🏁 Getting Started
To get a local copy up and running, follow these simple steps.

Prerequisites
Node.js (v18 or later)

npm or yarn

Installation
Clone the repository:

git clone https://github.com/your-username/mydishgenie.git
cd mydishgenie

Install NPM packages:

npm install

Set up your environment variables:

Create a file named .env.local in the root of your project.

You will need to get your credentials from Firebase and Google AI Studio.

Add the following variables to your .env.local file:

# Firebase Client Keys
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="..."

# Google Gemini API Key
GEMINI_API_KEY="AIzaSy..."

# Firebase Admin SDK Key (must be a single line)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type": "service_account", "project_id": "...", ...}'

Run the development server:

npm run dev

Open http://localhost:3000 with your browser to see the result.

🚀 Deployment
This application is optimized for deployment on Vercel.

Push your code to a GitHub repository.

Import the repository into Vercel.

Add the same environment variables from your .env.local file to the Vercel project settings.

Deploy! Vercel will automatically handle the build process.
