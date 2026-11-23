import { useCallback, useEffect, useState } from 'react';
import { clearConversation, loadConversation, saveConversation } from '../services/storage/conversationStore.js';

export function useConversation() {
  const [messages, setMessages] = useState(() => loadConversation());

  useEffect(() => {
    saveConversation(messages);
  }, [messages]);

  const addMessage = useCallback((message) => {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      ...message,
    };
    setMessages((prev) => [...prev, entry]);
    return entry;
  }, []);

  const reset = useCallback(() => {
    clearConversation();
    setMessages([]);
  }, []);

  return { messages, addMessage, reset };
}
