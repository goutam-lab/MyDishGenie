// components/AIChefBot.tsx
"use client"

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, X, LoaderCircle } from 'lucide-react';

interface Message {
    role: 'user' | 'model';
    text: string;
}

export default function AIChefBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: Message = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chef-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ history: [...messages, userMessage] }),
            });

            if (!response.ok) {
                throw new Error('Failed to get response from AI Chef');
            }

            const data = await response.json();
            const botMessage: Message = { role: 'model', text: data.response };
            setMessages(prev => [...prev, botMessage]);

        } catch (error) {
            console.error(error);
            const errorMessage: Message = { role: 'model', text: "Sorry, I'm having trouble connecting to the kitchen. Please try again later." };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Chatbot Toggle Button */}
            <motion.div
                className="fixed bottom-6 right-6 z-50"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1, duration: 0.5, type: 'spring' }}
            >
                <Button
                    onClick={() => setIsOpen(true)}
                    className="rounded-full w-16 h-16 bg-orange-600 hover:bg-orange-700 shadow-lg"
                >
                    <Bot className="w-8 h-8" />
                </Button>
            </motion.div>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="fixed bottom-24 right-6 z-50 w-full max-w-sm h-[60vh] bg-white rounded-lg shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
                            <h3 className="font-bold text-lg">AI Chef Assistant</h3>
                            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Messages */}
                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-4">
                                {messages.map((msg, index) => (
                                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-xs px-4 py-2 rounded-lg ${msg.role === 'user' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-800'}`}>
                                            <p className="text-sm">{msg.text}</p>
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="max-w-xs px-4 py-2 rounded-lg bg-gray-200 text-gray-800">
                                            <LoaderCircle className="w-5 h-5 animate-spin" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>

                        {/* Input */}
                        <div className="p-4 border-t bg-gray-50 rounded-b-lg">
                            <div className="flex items-center space-x-2">
                                <Input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Ask about recipes, ingredients..."
                                    disabled={isLoading}
                                />
                                <Button onClick={handleSend} disabled={isLoading}>
                                    <Send className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
