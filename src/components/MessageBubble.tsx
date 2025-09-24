// MessageBubble.tsx
// Renders an individual message with role-based styling and timestamp.
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';
import { Cloud, User, Bot } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isTyping?: boolean;
}

export const MessageBubble = ({ message, isTyping = false }: MessageBubbleProps) => {
  const isUser = message.role === 'user';
  const isEmpty = !message.content.trim();

  return (
    <div
      className={cn(
        "flex w-full mb-4 animate-message-slide-in",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "flex items-start space-x-3 max-w-[85%] md:max-w-[70%]",
          isUser && "flex-row-reverse space-x-reverse"
        )}
      >
        {/* Avatar */}
        <div
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-message-agent-border text-message-agent-foreground"
          )}
        >
          {isUser ? (
            <User className="w-4 h-4" />
          ) : (
            <Cloud className="w-4 h-4" />
          )}
        </div>

        {/* Message Content */}
        <div
          className={cn(
            "relative rounded-message px-4 py-3 shadow-message",
            isUser
              ? "bg-gradient-message text-message-user-foreground"
              : "bg-message-agent border border-message-agent-border text-message-agent-foreground"
          )}
        >
          {isEmpty && isTyping ? (
            <div className="flex items-center space-x-1">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-typing-pulse"></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-typing-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-typing-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <span className="text-sm text-muted-foreground ml-2">Agent is thinking...</span>
            </div>
          ) : (
            <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </div>
          )}

          {/* Message timestamp */}
          <div
            className={cn(
              "text-xs mt-2 opacity-70",
              isUser ? "text-message-user-foreground" : "text-muted-foreground"
            )}
          >
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>

          {/* Message tail */}
          <div
            className={cn(
              "absolute top-4 w-0 h-0",
              isUser
                ? "right-0 translate-x-full border-l-8 border-l-primary border-t-4 border-t-transparent border-b-4 border-b-transparent"
                : "left-0 -translate-x-full border-r-8 border-r-message-agent border-t-4 border-t-transparent border-b-4 border-b-transparent"
            )}
          />
        </div>
      </div>
    </div>
  );
};