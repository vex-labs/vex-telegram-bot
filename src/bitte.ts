import axios from "axios";

export interface BitteConnection {
  isConnected: boolean;
  conversationId?: string;
}

export class BitteClient {
  private connection: BitteConnection = {
    isConnected: false
  };

  public get isConnected(): boolean {
    return this.connection.isConnected;
  }

  public get conversationId(): string | undefined {
    return this.connection.conversationId;
  }

  async initialize(): Promise<void> {
    try {
      // Initial handshake with Bitte API
      const response = await axios.post("https://wallet.bitte.ai/api/v1/chat", {
        config: {
          agentId: "default"
        },
        message: "init" // Initial connection message
      });

      if (response.data.id) {
        this.connection = {
          isConnected: true,
          conversationId: response.data.id
        };
        console.log("Successfully connected to Bitte AI");
      }
    } catch (error) {
      console.error("Failed to initialize Bitte connection:", error);
      throw new Error("Failed to establish connection with Bitte AI");
    }
  }
} 