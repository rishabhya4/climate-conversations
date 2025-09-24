import { useEffect, useRef } from 'react';
import { useWeatherChat } from '@/hooks/useWeatherChat';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Cloud, Trash2, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export const WeatherChat = () => {
  const { messages, isLoading, error, sendMessage, clearChat, dismissError } = useWeatherChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-screen bg-gradient-bg">
      {/* Header */}
      <header className="bg-chat-header border-b border-border shadow-header">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-sky rounded-full text-white shadow-lg">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Weather Agent</h1>
                <p className="text-sm text-muted-foreground">Ask me about weather anywhere in the world</p>
              </div>
            </div>
            
            {hasMessages && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearChat}
                className="text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Chat
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Messages Container */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6">
            {/* Welcome message when no messages */}
            {!hasMessages && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-fade-in">
                <div className="w-20 h-20 bg-gradient-sky rounded-full flex items-center justify-center shadow-lg">
                  <Cloud className="w-10 h-10 text-white" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-foreground">Welcome to Weather Agent</h2>
                  <p className="text-muted-foreground max-w-md">
                    Ask me about current weather, forecasts, or weather conditions for any city around the world.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-md">
                  <Button
                    variant="outline"
                    onClick={() => sendMessage("What's the weather in London?")}
                    className="justify-start text-left h-auto py-3 px-4"
                  >
                    <div>
                      <div className="font-medium">London Weather</div>
                      <div className="text-xs text-muted-foreground">Current conditions</div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => sendMessage("Will it rain tomorrow in New York?")}
                    className="justify-start text-left h-auto py-3 px-4"
                  >
                    <div>
                      <div className="font-medium">Rain Forecast</div>
                      <div className="text-xs text-muted-foreground">Tomorrow's weather</div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => sendMessage("Weather forecast for Paris next week")}
                    className="justify-start text-left h-auto py-3 px-4"
                  >
                    <div>
                      <div className="font-medium">Weekly Forecast</div>
                      <div className="text-xs text-muted-foreground">7-day outlook</div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => sendMessage("What's the temperature in Tokyo right now?")}
                    className="justify-start text-left h-auto py-3 px-4"
                  >
                    <div>
                      <div className="font-medium">Current Temperature</div>
                      <div className="text-xs text-muted-foreground">Real-time data</div>
                    </div>
                  </Button>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <Alert className="mb-4 border-destructive bg-destructive/5">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-destructive">
                  <div className="flex items-center justify-between">
                    <span>{error}</span>
                    <div className="flex space-x-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={dismissError}
                        className="h-6 text-xs"
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Messages */}
            <div className="space-y-1">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isTyping={isLoading && message.role === 'assistant' && !message.content}
                />
              ))}
            </div>

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      {/* Input */}
      <ChatInput
        onSendMessage={sendMessage}
        isLoading={isLoading}
        placeholder="Ask about weather conditions, forecasts, or any weather-related questions..."
      />
    </div>
  );
};