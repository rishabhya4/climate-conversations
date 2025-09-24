import { useState, useRef, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export const ChatInput = ({ onSendMessage, isLoading, placeholder = "Ask about the weather..." }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!message.trim() || isLoading) return;
    
    onSendMessage(message.trim());
    setMessage('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
  };

  return (
    <div className="p-4 bg-card border-t border-border shadow-header">
      <div className="flex items-end space-x-3 max-w-4xl mx-auto">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={isLoading}
            className={cn(
              "min-h-[44px] max-h-[150px] resize-none rounded-lg",
              "border-input bg-background shadow-input",
              "focus:border-input-focus focus:ring-1 focus:ring-input-focus",
              "placeholder:text-muted-foreground",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            rows={1}
          />
          
          {/* Character count indicator */}
          {message.length > 0 && (
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-1 rounded">
              {message.length}
            </div>
          )}
        </div>
        
        <Button
          onClick={handleSend}
          disabled={!message.trim() || isLoading}
          size="icon"
          className={cn(
            "h-11 w-11 shrink-0 rounded-lg",
            "bg-primary hover:bg-primary-hover text-primary-foreground",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-all duration-200 ease-in-out",
            "shadow-input hover:shadow-lg"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {/* Hint text */}
      <div className="text-xs text-muted-foreground text-center mt-2">
        Press Enter to send • Shift + Enter for new line
      </div>
    </div>
  );
};