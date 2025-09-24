// WeatherChat.tsx
// High-level chat UI: header (thread, theme, history, export, re-send),
// messages list, error banner, and input. Uses useWeatherChat hook.
import { useEffect, useRef, useState } from 'react';
import { useWeatherChat } from '@/hooks/useWeatherChat';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Cloud, Trash2, AlertCircle, Sun, Moon, RefreshCw, History as HistoryIcon, Download, Trash, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useLocation, useNavigate } from 'react-router-dom';

export const WeatherChat = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const defaultThread = (import.meta as any).env?.VITE_THREAD_ID || 2;
  const [threadId, setThreadId] = useState<string | number>(defaultThread);
  const [isDark, setIsDark] = useState<boolean>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    if (stored) return stored === 'dark';
    return document.documentElement.classList.contains('dark');
  });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<Array<{ threadId: string; lastAt?: Date; count: number }>>([]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const { messages, isLoading, error, sendMessage, clearChat, dismissError } = useWeatherChat(threadId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleExport = () => {
    try {
      const data = {
        threadId,
        exportedAt: new Date().toISOString(),
        messages: messages.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp.toISOString(),
        })),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `weather-chat-thread-${threadId}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const exportThread = (tid: string | number) => {
    try {
      const raw = localStorage.getItem(`weather-chat:${tid}`);
      const parsed = raw ? JSON.parse(raw) : [];
      const data = {
        threadId: tid,
        exportedAt: new Date().toISOString(),
        messages: (parsed || []).map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        })),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `weather-chat-thread-${tid}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const refreshHistory = () => {
    try {
      const items: Array<{ threadId: string; lastAt?: Date; count: number }> = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i) || '';
        if (!key.startsWith('weather-chat:')) continue;
        const tid = key.replace('weather-chat:', '');
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          const arr = JSON.parse(raw) as Array<{ timestamp: string }>;
          const count = Array.isArray(arr) ? arr.length : 0;
          const lastStr = count > 0 ? arr[count - 1].timestamp : undefined;
          const lastAt = lastStr ? new Date(lastStr) : undefined;
          items.push({ threadId: tid, lastAt, count });
        } catch {}
      }
      items.sort((a, b) => {
        const at = a.lastAt ? a.lastAt.getTime() : 0;
        const bt = b.lastAt ? b.lastAt.getTime() : 0;
        return bt - at;
      });
      setHistoryItems(items);
    } catch {}
  };

  const handleResendLast = () => {
    if (isLoading) return;
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (lastUser && lastUser.content.trim()) {
      sendMessage(lastUser.content.trim());
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const hasMessages = messages.length > 0;

  const handleBack = () => {
    try {
      if (window.history.length > 1) {
        navigate(-1);
        return;
      }
    } catch {}

    if (location.pathname !== '/') {
      navigate('/');
      return;
    }

    if (hasMessages) {
      clearChat();
    }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-gradient-bg">
      {/* Header */}
      <header className="bg-chat-header border-b border-border shadow-header sticky top-0 z-40 pt-[calc(env(safe-area-inset-top,0))]">
        <div className="max-w-4xl mx-auto px-4 pt-3 pb-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-3">
              {hasMessages && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleBack}
                  className="shrink-0"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-sky rounded-full text-white shadow-lg">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Weather Agent</h1>
                <p className="text-sm text-muted-foreground hidden sm:block">Ask me about weather anywhere in the world</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="hidden md:flex items-center space-x-2">
                <Input
                  value={threadId}
                  onChange={(e) => setThreadId(e.target.value)}
                  placeholder="Thread ID"
                  className="h-9 w-40"
                />
              </div>
              <Sheet open={historyOpen} onOpenChange={(o) => { setHistoryOpen(o); if (o) refreshHistory(); }}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <HistoryIcon className="w-4 h-4 mr-2" />
                    History
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[360px] sm:w-[400px]">
                  <SheetHeader>
                    <SheetTitle>Chat History</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-2">
                    {historyItems.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No saved threads yet.</div>
                    ) : (
                      historyItems.map((item) => (
                        <div key={item.threadId} className="flex items-center justify-between border rounded-md px-3 py-2">
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">Thread {item.threadId}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.count} messages{item.lastAt ? ` • ${item.lastAt.toLocaleString()}` : ''}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm" onClick={() => { setThreadId(item.threadId); setHistoryOpen(false); }}>
                              Open
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => exportThread(item.threadId)} aria-label="Export thread">
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button variant="destructive" size="icon" onClick={() => { localStorage.removeItem(`weather-chat:${item.threadId}`); refreshHistory(); }} aria-label="Delete thread">
                              <Trash className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </SheetContent>
              </Sheet>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="text-muted-foreground hover:text-foreground hidden md:flex"
              >
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResendLast}
                disabled={isLoading || !messages.some(m => m.role === 'user')}
                className="text-muted-foreground hover:text-foreground hidden sm:flex"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Re-send
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDark((v) => !v)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              {hasMessages && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearChat}
                  className="text-muted-foreground hover:text-foreground hidden md:flex"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Chat
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Messages Container */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6 pb-28">
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
                    onClick={() => sendMessage("What's the weather in Mumbai?")}
                    className="justify-start text-left h-auto py-3 px-4"
                  >
                    <div>
                      <div className="font-medium">Mumbai Weather</div>
                      <div className="text-xs text-muted-foreground">Current conditions</div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => sendMessage("Will it rain tomorrow in Delhi?")}
                    className="justify-start text-left h-auto py-3 px-4"
                  >
                    <div>
                      <div className="font-medium">Rain Forecast (Delhi)</div>
                      <div className="text-xs text-muted-foreground">Tomorrow's weather</div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => sendMessage("Weather forecast for Bengaluru next week")}
                    className="justify-start text-left h-auto py-3 px-4"
                  >
                    <div>
                      <div className="font-medium">Weekly Forecast (Bengaluru)</div>
                      <div className="text-xs text-muted-foreground">7-day outlook</div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => sendMessage("What's the temperature in Kolkata right now?")}
                    className="justify-start text-left h-auto py-3 px-4"
                  >
                    <div>
                      <div className="font-medium">Current Temperature (Kolkata)</div>
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