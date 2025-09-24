import { useState, useCallback } from 'react';
import { Message, ChatState } from '@/types/chat';

const GEMINI_API_KEY = 'AIzaSyC6sD6gOx-BSl8l8JB6B2RcSniMeCPEXYU';
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

export const useWeatherChat = () => {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
  });

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || chatState.isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    // Add user message immediately
    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    try {
      // Create weather-focused prompt
      const weatherPrompt = `You are a helpful weather assistant. The user asked: "${content.trim()}"
      
      Please provide current weather information, forecasts, or weather-related assistance. Be conversational and helpful.
      
      Previous conversation context:
      ${chatState.messages.map(msg => `${msg.role}: ${msg.content}`).join('\n')}`;

      const requestBody = {
        contents: [{
          parts: [{
            text: weatherPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      };

      const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const assistantContent = data.candidates?.[0]?.content?.parts?.[0]?.text || 
        'I apologize, but I encountered an error while processing your request. Please try again.';

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
      };

      // Add assistant message
      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
      }));

    } catch (error) {
      console.error('Chat error:', error);
      
      setChatState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        messages: prev.messages.slice(0, -1), // Remove user message on error
      }));
    }
  }, [chatState.messages, chatState.isLoading]);

  const clearChat = useCallback(() => {
    setChatState({
      messages: [],
      isLoading: false,
      error: null,
    });
  }, []);

  const dismissError = useCallback(() => {
    setChatState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  return {
    messages: chatState.messages,
    isLoading: chatState.isLoading,
    error: chatState.error,
    sendMessage,
    clearChat,
    dismissError,
  };
};