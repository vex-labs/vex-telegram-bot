import axios from 'axios';
import { config } from './config';

export interface BitteMessage {
  role: string;
  content: string;
  tool_invocations: any[];
  annotations?: any;
}

export interface BitteChatResponse {
  id: string;
  messages: BitteMessage[];
  status: string;
}

function parseStreamingResponse(data: string, thread_id: string): BitteChatResponse {
  const lines = data.split('\n').filter(Boolean);
  let fullMessage = '';
  let metadata = {};

  for (const line of lines) {
    if (line.startsWith('0:')) {
      try {
        const content = JSON.parse(line.slice(2));
        fullMessage += content;
      } catch (e) {
        console.warn('Failed to parse content chunk:', line);
      }
    } else if (line.startsWith('e:') || line.startsWith('d:')) {
      try {
        const data = JSON.parse(line.slice(2));
        metadata = { ...metadata, ...data };
      } catch (e) {
        console.warn('Failed to parse metadata:', line);
      }
    }
  }

  return {
    id: thread_id,
    messages: [{
      role: "assistant",
      content: fullMessage,
      tool_invocations: []
    }],
    status: "completed"
  };
}

export async function bitteChat(message: string, thread_id: string = "1", history: BitteMessage[] = []): Promise<BitteChatResponse> {
  const API_KEY = process.env.BITTE_API_KEY;
  if (!API_KEY) {
    throw new Error("BITTE_API_KEY environment variable is not set");
  }

  try {
    // Add the new message to the history
    const messages = [
      ...history,
      {
        role: "user",
        content: message,
        tool_invocations: [],
        annotations: null
      }
    ];

    const response = await axios.post('https://wallet.bitte.ai/api/v1/chat', {
      config: {
        agentId: config.agentId,
        mode: "debug",
      },
      id: thread_id,
      messages: messages,
    }, {
      headers: { 
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      responseType: 'text'
    });

    return parseStreamingResponse(response.data, thread_id);
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error('Failed to chat:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url
      });
    } else {
      console.error('Failed to chat:', error);
    }
    throw error;
  }
} 