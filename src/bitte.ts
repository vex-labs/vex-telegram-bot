import axios from 'axios';

interface BitteAgentResult {
  id: string;
  name: string;
  description: string;
  instructions: string;
  verified: boolean;
}

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

export async function getBitteAgents(): Promise<BitteAgentResult[]> {
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
          content: "Hello",
          tool_invocations: [],
          annotations: null
        }
      ],
      accountId: "pivortex.near"
    }, {
      headers: { 
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error('Failed to fetch AI assistants:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url
      });
    } else {
      console.error('Failed to fetch AI assistants:', error);
    }
    throw error;
  }
}

export async function initiateBitteChat(message: string = "Hello"): Promise<BitteChatResponse> {
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
    }, {
      headers: { 
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Chat initiated:', response.data);
    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error('Failed to initiate chat:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url
      });
    } else {
      console.error('Failed to initiate chat:', error);
    }
    throw error;
  }
} 