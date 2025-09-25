// useWeatherChat.ts
// Custom hook managing chat state, streaming API integration, per-thread
// persistence, and error/loading handling for the Weather Agent.
import { useState, useCallback, useEffect } from 'react';
import { Message, ChatState } from '@/types/chat';

// Heuristic check to ensure queries are weather/climate-related.
const isWeatherRelated = (text: string): boolean => {
  const t = text.toLowerCase();
  const keywords = [
    'weather', 'climate', 'forecast', 'temperature', 'temp', 'rain', 'rainfall', 'precip', 'precipitation',
    'humidity', 'wind', 'snow', 'storm', 'thunder', 'uv', 'uv index', 'sunrise', 'sunset', 'aqi', 'air quality',
    'visibility', 'pressure', 'barometric', 'dew point', 'heat index', 'feels like', 'meteorology', 'cyclone',
    'hurricane', 'typhoon', 'flood', 'drought', 'monsoon', 'smog', 'hail', 'lightning', 'gust', 'breeze',
    'cloud', 'cloudy', 'clear sky', 'overcast', 'drizzle', 'blizzard', 'fog', 'mist', 'sleet',
    'weekly', 'week', '7-day', '7 day', 'today', 'tomorrow', 'hourly', 'daily', 'now', 'real-time', 'realtime'
  ];
  return keywords.some(k => t.includes(k));
};

// Allow brief continuations that rely on prior context
const isAffirmationOrContinuation = (text: string): boolean => {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  const okPhrases = [
    'yes', 'yeah', 'yup', 'sure', 'okay', 'ok', 'pls', 'please', 'go ahead', 'do it', 'all', 'both',
    'everything', 'all details', 'all info', 'give me all details',
    'current', 'now', 'today', 'tomorrow', 'next week', 'weekly', 'hourly', 'daily', 'go on', 'continue',
    'proceed', 'fine', 'alright', 'right', 'correct'
  ];
  return okPhrases.includes(t) || okPhrases.some(p => t === p || t.startsWith(p + ' '));
};

// Topic decision that considers recent chat context
const isOnTopic = (text: string, history: Message[]): boolean => {
  if (isWeatherRelated(text)) return true;
  if (isAffirmationOrContinuation(text)) {
    // Look back a few turns for any weather-related user message or assistant content
    const recent = history.slice(-6); // last ~3 exchanges
    const hasWeatherContext = recent.some(m => isWeatherRelated(m.content));
    return hasWeatherContext;
  }
  return false;
};

// Detect if the user likely wants a forecast (esp. hourly/7-day) so we can nudge formatting
const needsHourlyForecastFormat = (text: string): boolean => {
  const t = text.toLowerCase();
  const cues = [
    'forecast', 'hourly', '7-day', '7 day', 'next week', 'tomorrow', 'will it rain', 'rain tomorrow', 'weekly', 'daily'
  ];
  return cues.some(c => t.includes(c));
};

const getDefaultThreadId = (): number | string => {
  const threadIdEnv = (import.meta as any).env?.VITE_THREAD_ID;
  return threadIdEnv && threadIdEnv.toString().trim().length > 0 ? threadIdEnv : 2;
};

export const useWeatherChat = (threadIdParam?: number | string) => {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
  });
  const threadId = threadIdParam ?? getDefaultThreadId();

  // Load messages for current thread from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`weather-chat:${threadId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as any[];
        const revived: Message[] = parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
        setChatState((prev) => ({ ...prev, messages: revived }));
      } else {
        setChatState((prev) => ({ ...prev, messages: [] }));
      }
    } catch {
      // ignore
    }
  }, [threadId]);

  // Persist messages per thread to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`weather-chat:${threadId}`, JSON.stringify(chatState.messages));
    } catch {
      // ignore
    }
  }, [chatState.messages, threadId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || chatState.isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    // Guardrail: if off-topic, refuse locally without calling the API.
    if (!isOnTopic(userMessage.content, chatState.messages)) {
      const refusal: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content:
          'I can only help with climate and weather-related questions. Please ask about weather conditions, forecasts, temperatures, air quality, wind, humidity, or similar topics.',
        timestamp: new Date(),
      };
      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, userMessage, refusal],
        isLoading: false,
        error: null,
      }));
      return;
    }

    // Add user message immediately
    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    try {
      // Prepare streaming request to Mastra Weather Agent
      const endpoint = 'https://millions-screeching-vultur.mastra.cloud/api/agents/weatherAgent/stream';

      // Hidden instruction to keep the backend agent on-topic (not shown in UI)
      const guardrailInstruction =
        'You are a helpful Weather and Climate assistant. Only answer questions related to weather and climate: current conditions, forecasts, temperatures, precipitation, wind, humidity, visibility, pressure, UV, air quality, etc. If the user asks about anything unrelated, politely refuse and steer them back to a weather-related topic. For valid weather questions, always provide the best answer you can. If key details like location or timeframe are missing, ask a concise clarifying question (e.g., "Which city and for what dates?") rather than refusing.';

      const basePayload = [...chatState.messages, userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const formattingInstruction = `When the user asks about forecasts (hourly, tomorrow, weekly, 7-day), reply as a clean hourly list without extra explanations. For each hour, include: Time (e.g., 12 am, 1 am), Temperature with unit, and a concise condition (Clear, Cloudy, Rain, etc.). Example format: \n12 am    83°    Clear\n1 am     82°    Clear`;

      const messagesPayload = [
        { role: 'user', content: guardrailInstruction },
        ...(needsHourlyForecastFormat(userMessage.content) ? [{ role: 'user', content: formattingInstruction }] : []),
        ...basePayload,
      ];

      const requestBody = {
        messages: messagesPayload,
        runId: 'weatherAgent',
        maxRetries: 2,
        maxSteps: 5,
        temperature: 0.5,
        topP: 1,
        runtimeContext: {},
        threadId,
        resourceId: 'weatherAgent',
      } as const;

      // Insert a placeholder assistant message for streaming updates
      const assistantMessageId = `assistant-${Date.now()}`;
      setChatState(prev => ({
        ...prev,
        messages: [
          ...prev.messages,
          { id: assistantMessageId, role: 'assistant', content: '', timestamp: new Date() },
        ],
      }));

      const response = await fetch(endpoint, {
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

      if (!response.ok || !response.body) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let bufferedText = '';

      while (!done) {
        const result = await reader.read();
        done = result.done === true;
        const chunkText = decoder.decode(result.value || new Uint8Array(), { stream: !done });
        if (!chunkText) continue;

        bufferedText += chunkText;

        // Try to parse line-by-line (supports SSE-like or NDJSON). Fallback: append raw text.
        const lines = bufferedText.split(/\r?\n/);
        // Keep the last partial line in buffer
        bufferedText = lines.pop() || '';

        let accumulatedAppend = '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Handle "data: ..." prefix if present
          const dataStr = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed;
          // Mastra stream format support: lines like `0:"Hello"`, and meta lines `f:{}`, `e:{}`, `d:{}`
          // 1) Ignore meta lines starting with f:, e:, d:
          if (/^[fed]\s*:/i.test(dataStr)) {
            // Skip meta and end/diagnostic events
            continue;
          }

          // 2) Token lines like `0:"I"` or `12:" weather"` → extract quoted payload
          const indexTokenMatch = dataStr.match(/^\d+\s*:\s*("[\s\S]*")$/);
          if (indexTokenMatch) {
            const quoted = indexTokenMatch[1];
            try {
              const token = JSON.parse(quoted);
              if (typeof token === 'string') {
                accumulatedAppend += token;
                continue;
              }
            } catch {
              // fall through if malformed
            }
          }

          try {
            const json = JSON.parse(dataStr);
            const token =
              (typeof json === 'string' ? json : (
                json?.delta ?? json?.content ?? json?.text ?? json?.message?.content
              ));
            if (typeof token === 'string') {
              accumulatedAppend += token;
            } else {
              // If json has nested choices style
              const fromChoices = json?.choices?.[0]?.delta?.content ?? json?.choices?.[0]?.delta?.text;
              if (typeof fromChoices === 'string') {
                accumulatedAppend += fromChoices;
              }
            }
          } catch {
            // Not JSON line, append as plain text
            // For safety, ignore non-JSON non-token lines to avoid polluting chat
            // If you wish to debug, you can log dataStr here
          }
        }

        if (accumulatedAppend.length > 0) {
          setChatState(prev => ({
            ...prev,
            messages: prev.messages.map(m =>
              m.id === assistantMessageId ? { ...m, content: (m.content + accumulatedAppend) } : m
            ),
          }));
        }
      }

      // Finalize loading state
      setChatState(prev => ({
        ...prev,
        isLoading: false,
      }));

    } catch (error) {
      console.error('Chat error:', error);
      
      setChatState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        // Remove the last two messages (assistant placeholder and user) if present
        messages: prev.messages.slice(0, Math.max(0, prev.messages.length - 2)),
      }));
    }
  }, [chatState.messages, chatState.isLoading]);

  const clearChat = useCallback(() => {
    setChatState({
      messages: [],
      isLoading: false,
      error: null,
    });
    try {
      localStorage.removeItem(`weather-chat:${threadId}`);
    } catch {}
  }, [threadId]);

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
    threadId,
  };
};