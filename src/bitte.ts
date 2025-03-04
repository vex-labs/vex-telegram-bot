import axios from 'axios';

interface BitteMessage {
  role: string;
  content: string;
  tool_invocations: any[];
  annotations?: any;
}

interface BitteChatResponse {
  id: string;
  messages: BitteMessage[];
  status: string;
}

function parseStreamingResponse(data: string): BitteChatResponse {
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
    id: "4321",
    messages: [{
      role: "assistant",
      content: fullMessage,
      tool_invocations: []
    }],
    status: "completed"
  };
}

export async function bitteChat(message: string = "Hello", accountId?: string): Promise<BitteChatResponse> {
  const API_KEY = process.env.BITTE_API_KEY;
  if (!API_KEY) {
    throw new Error("BITTE_API_KEY environment variable is not set");
  }

  try {
    const response = await axios.post('https://wallet.bitte.ai/api/v1/chat', {
      config: {
        agentId: "ref-finance-agent.vercel.app"
      },
      id: "4321",
      messages: [
        {
          role: "user",
          content: message,
          tool_invocations: [],
          annotations: null
        }
      ],
      ...(accountId && { accountId })
    }, {
      headers: { 
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      responseType: 'text'
    });

    return parseStreamingResponse(response.data);
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