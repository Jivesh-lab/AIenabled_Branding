import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

export type MessageRole = 'user' | 'agent' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  isStreaming?: boolean;
  agentName?: string; // which agent is currently thinking/responding
}

export interface AgentChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sessionId: string;
  readinessScore: number | null;
}

export function useAgentChat(userId: string, userRole: string = 'student', startupId?: string) {
  const [state, setState] = useState<AgentChatState>({
    messages: [],
    isLoading: false,
    error: null,
    sessionId: uuidv4(),
    readinessScore: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Abort previous request if still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: text,
    };

    const agentMessageId = uuidv4();

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      messages: [
        ...prev.messages,
        userMessage,
        { id: agentMessageId, role: 'agent', content: '', isStreaming: true }
      ],
    }));

    try {
      const baseUrl = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000';
      const url = new URL(`${baseUrl}/api/chat/stream/${state.sessionId}`);
      url.searchParams.append('message', text);
      url.searchParams.append('user_id', userId);
      url.searchParams.append('user_role', userRole);
      if (startupId) {
        url.searchParams.append('startup_id', startupId);
      }

      // We use EventSource API via browser, but since we need custom headers or it's a GET, 
      // standard EventSource is fine. Since our FastAPI endpoint takes GET params:
      const eventSource = new EventSource(url.toString());

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'step') {
          // Agent thinking step
          setState((prev) => ({
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === agentMessageId
                ? { ...m, agentName: data.agent }
                : m
            ),
          }));
        } else if (data.type === 'response') {
          // Token chunk
          setState((prev) => ({
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === agentMessageId
                ? { ...m, content: m.content + data.content }
                : m
            ),
          }));
        } else if (data.type === 'done') {
          // Complete
          eventSource.close();
          setState((prev) => ({
            ...prev,
            isLoading: false,
            readinessScore: data.readiness_score || prev.readinessScore,
            messages: prev.messages.map((m) =>
              m.id === agentMessageId
                ? { ...m, isStreaming: false }
                : m
            ),
          }));
        } else if (data.type === 'error') {
          eventSource.close();
          setState((prev) => ({ ...prev, isLoading: false, error: data.content }));
        }
      };

      eventSource.onerror = (err) => {
        eventSource.close();
        setState((prev) => ({ ...prev, isLoading: false, error: 'Connection lost to agent service.' }));
      };

      // Cleanup function allows aborting early
      abortControllerRef.current.signal.addEventListener('abort', () => {
        eventSource.close();
        setState((prev) => ({ ...prev, isLoading: false }));
      });

    } catch (error: any) {
      setState((prev) => ({ ...prev, isLoading: false, error: error.message }));
    }
  }, [state.sessionId, userId, userRole, startupId]);

  const clearChat = useCallback(() => {
    setState({
      messages: [],
      isLoading: false,
      error: null,
      sessionId: uuidv4(),
      readinessScore: null,
    });
  }, []);

  return {
    ...state,
    sendMessage,
    clearChat,
  };
}
