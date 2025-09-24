export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatApiRequest {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  runId: string;
  maxRetries: number;
  maxSteps: number;
  temperature: number;
  topP: number;
  runtimeContext: Record<string, unknown>;
  threadId: string;
  resourceId: string;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export interface StreamResponse {
  choices?: Array<{
    delta: {
      content?: string;
    };
  }>;
  content?: string;
}