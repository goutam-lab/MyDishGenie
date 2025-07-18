"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChefHat, Sparkles, Users, ArrowRight } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import Link from "next/link"
import React from 'react'
import { motion } from "framer-motion"

// --- Animation Variants ---
const sectionVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.8, ease: "easeOut" }
  }
};

const cardContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};


// --- Sub-components ---
const FeatureCard = ({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) => (
  <motion.div 
    variants={cardVariants}
    whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
    className="text-center p-6"
  >
    <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-gray-800 mb-2 font-heading">{title}</h3>
    <p className="text-gray-600">{children}</p>
  </motion.div>
);

const TestimonialCard = ({ name, location, children }: { name: string, location: string, children: React.ReactNode }) => (
    <motion.div variants={cardVariants}>
        <Card className="h-full">
            <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full mr-4"></div>
                    <div>
                        <p className="font-bold text-gray-800">{name}</p>
                        <p className="text-sm text-gray-500">{location}</p>
                    </div>
                </div>
                <p className="text-gray-600 italic">"{children}"</p>
            </CardContent>
        </Card>
    </motion.div>
);


export default function LandingPage() {
  const headlineWords = "Never Wonder What to Cook Again.".split(" ");

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-red-50 font-body overflow-x-hidden">
        {/* Header */}
        <motion.header 
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="container mx-auto px-4 py-6"
        >
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ChefHat className="h-8 w-8 text-orange-600" />
              <span className="text-2xl font-bold text-gray-800 font-heading">MyDishGenie</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/auth/login">
                <Button variant="outline">Sign In</Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-orange-600 hover:bg-orange-700">Get Started</Button>
              </Link>
            </div>
          </nav>
        </motion.header>

        {/* Hero Section */}
        <section className="relative container mx-auto px-4 pt-20 pb-24 text-center">
          <div className="absolute inset-0 -z-10 flex items-center justify-center opacity-15 pointer-events-none">
              <img 
                src="/Image.jpg" 
                alt="Indian spices background" 
                className="w-full max-w-4xl animate-[pulse_8s_ease-in-out_infinite]" 
              />
          </div>
          
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-extrabold text-gray-800 mb-6 font-heading leading-tight">
              {headlineWords.map((word, index) => (
                <span key={index} className="inline-block overflow-hidden">
                  <span 
                    className="inline-block animate-[slideInUp_0.8s_ease-out_forwards]"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {word}&nbsp;
                  </span>
                </span>
              ))}
            </h1>
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              Get instant, personalized Indian dish recommendations from our AI-powered chef. Your next delicious meal is just a click away.
            </p>
            <Link href="/auth/signup">
              <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-white px-10 py-7 text-xl shadow-lg hover:shadow-xl transition-shadow transform hover:-translate-y-1">
                <Sparkles className="mr-3 h-6 w-6" />
                Find My Perfect Dish
              </Button>
            </Link>
          </div>

          <div className="mt-20 relative max-w-5xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <img 
                src="/240_F_436365754_z3i5Es0sFmZuLY6GZIzdiU01v9HqpGZe.jpg" 
                alt="Biryani" 
                className="w-full h-full object-cover rounded-2xl shadow-lg transform transition-transform duration-500 hover:scale-105 animate-[fadeInUp_1s_ease-out]" 
              />
              <img 
                src="/240_F_502530987_5pHSpsIwdxj4nLjutl5cR5gXLu7ER7FM.jpg" 
                alt="Dosa" 
                className="w-full h-full object-cover rounded-2xl shadow-lg transform transition-transform duration-500 hover:scale-105 animate-[fadeInUp_1s_ease-out_0.2s]" style={{animationFillMode: 'backwards'}} 
              />
              <img 
                src="/240_F_242743136_RYsBnwSL1Tfs1UsPUFXGrsPp1nPXe8nv.jpg" 
                alt="Curry" 
                className="w-full h-full object-cover rounded-2xl shadow-lg transform transition-transform duration-500 hover:scale-105 animate-[fadeInUp_1s_ease-out_0.4s]" style={{animationFillMode: 'backwards'}} 
              />
              <img 
                src="/240_F_466422564_LICnIvfjfGhieSKG4gxU35LirfjrxbOB.jpg" 
                alt="Samosa" 
                className="w-full h-full object-cover rounded-2xl shadow-lg transform transition-transform duration-500 hover:scale-105 animate-[fadeInUp_1s_ease-out_0.6s]" style={{animationFillMode: 'backwards'}} 
              />
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <motion.section 
          className="bg-white py-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={sectionVariants}
        >
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center text-gray-800 mb-12 font-heading">How MyDishGenie Works</h2>
            <motion.div 
              className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto"
              variants={cardContainerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
            >
              <FeatureCard icon={<Users className="h-8 w-8 text-orange-600" />} title="1. Tell Us About You">
                Share your preferences, dietary needs, and where you're from in a quick onboarding process.
              </FeatureCard>
              <FeatureCard icon={<Sparkles className="h-8 w-8 text-orange-600" />} title="2. Get AI Suggestions">
                Our smart AI analyzes your profile and suggests three perfect dishes just for you.
              </FeatureCard>
              <FeatureCard icon={<ChefHat className="h-8 w-8 text-orange-600" />} title="3. Cook & Enjoy!">
                Get inspired, view the recipe, and start your culinary adventure. It's that simple!
              </FeatureCard>
            </motion.div>
          </div>
        </motion.section>

        {/* Testimonials Section */}
        <motion.section
          className="py-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={sectionVariants}
        >
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center text-gray-800 mb-12 font-heading">What Our Users Say</h2>
            <motion.div 
              className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto"
              variants={cardContainerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              <TestimonialCard name="Priya S." location="Mumbai">
                I used to spend so much time deciding what to cook for dinner. MyDishGenie has been a lifesaver! The recommendations are always spot on.
              </TestimonialCard>
              <TestimonialCard name="Rohan K." location="Bangalore">
                As someone who loves to cook but is always busy, this app is perfect. The AI suggestions are surprisingly creative and delicious.
              </TestimonialCard>
              <TestimonialCard name="Anjali M." location="Delhi">
                Finally, an app that understands the diversity of Indian food! I've discovered so many new recipes from different regions. Highly recommend!
              </TestimonialCard>
            </motion.div>
          </div>
        </motion.section>

        {/* FAQ Section */}
        <motion.section
          className="bg-white py-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={sectionVariants}
        >
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-4xl font-bold text-center text-gray-800 mb-12 font-heading">Frequently Asked Questions</h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Is MyDishGenie free to use?</AccordionTrigger>
                <AccordionContent>
                  Yes! Our core features, including daily AI-powered recipe recommendations, are completely free. We may introduce premium features in the future.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>What kind of recipes can I find?</AccordionTrigger>
                <AccordionContent>
                  Our database is filled with thousands of authentic Indian recipes from every region, covering everything from quick breakfasts to elaborate festive meals.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>How does the AI personalization work?</AccordionTrigger>
                <AccordionContent>
                  Our AI analyzes the profile you create during onboarding—including your taste preferences, dietary needs, and even your location—to suggest recipes that you're most likely to love.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </motion.section>

        {/* CTA Section */}
        <motion.section 
          className="container mx-auto px-4 py-20 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={sectionVariants}
        >
          <div className="max-w-2xl mx-auto">
            <h2 className="text-4xl font-bold text-gray-800 mb-6 font-heading">Ready to Discover Your Next Favorite Dish?</h2>
            <p className="text-lg text-gray-600 mb-8">Join thousands of food lovers who never run out of delicious meal ideas!</p>
            <Link href="/auth/signup">
              <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-6 text-lg transform hover:scale-105 transition-transform">
                Start Your Culinary Journey
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </motion.section>

        {/* Footer */}
        <footer className="bg-gray-800 text-white py-8">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <ChefHat className="h-6 w-6 text-orange-600" />
              <span className="text-xl font-bold font-heading">MyDishGenie</span>
            </div>
            <p className="text-gray-400">
              Bringing the best of Indian cuisine to your table, one recommendation at a time.
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}