import { useState, useCallback } from 'react';
import { Message, ChatApiRequest, ChatState } from '@/types/chat';

const API_ENDPOINT = 'https://millions-screeching-vultur.mastra.cloud/api/agents/weatherAgent/stream';
const THREAD_ID = '2'; // Using provided thread ID

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
      const requestBody: ChatApiRequest = {
        messages: [
          // Include conversation history
          ...chatState.messages.map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' as const : 'user' as const,
            content: msg.content,
          })),
          {
            role: 'user',
            content: content.trim(),
          },
        ],
        runId: 'weatherAgent',
        maxRetries: 2,
        maxSteps: 5,
        temperature: 0.5,
        topP: 1,
        runtimeContext: {},
        threadId: THREAD_ID,
        resourceId: 'weatherAgent',
      };

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Accept': '*/*',
          'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8,fr;q=0.7',
          'Connection': 'keep-alive',
          'Content-Type': 'application/json',
          'x-mastra-dev-playground': 'true',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body available');
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      // Add empty assistant message to show typing indicator
      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
      }));

      let fullContent = '';
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullContent += parsed.content;
                  
                  // Update the assistant message with accumulated content
                  setChatState(prev => ({
                    ...prev,
                    messages: prev.messages.map(msg =>
                      msg.id === assistantMessage.id
                        ? { ...msg, content: fullContent }
                        : msg
                    ),
                  }));
                }
              } catch (parseError) {
                // Ignore JSON parse errors for partial chunks
                console.warn('Failed to parse chunk:', data);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Finalize the message
      setChatState(prev => ({
        ...prev,
        isLoading: false,
        messages: prev.messages.map(msg =>
          msg.id === assistantMessage.id
            ? { ...msg, content: fullContent || 'I apologize, but I encountered an error while processing your request. Please try again.' }
            : msg
        ),
      }));

    } catch (error) {
      console.error('Chat error:', error);
      
      setChatState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        messages: prev.messages.filter(msg => msg.id !== `user-${Date.now()}`), // Remove user message on error
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