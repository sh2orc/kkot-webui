import { BaseLLM } from "./base";
import { LLMMessage, LLMResponse } from "./types";

/**
 * LLM Chain class
 */
export class LLMChain {
  private llm: BaseLLM;

  /**
   * LLM Chain constructor
   * @param llm LLM instance to use
   */
  constructor(llm: BaseLLM) {
    this.llm = llm;
  }

  /**
   * Run the chain with messages
   * @param messages Array of messages to process
   * @returns Chain execution result
   */
  async run(messages: LLMMessage[]): Promise<LLMResponse> {
    try {
      // Basic LLM call
      return await this.llm.chat(messages);
    } catch (error) {
      throw new Error(`LLM chain execution error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Run the chain with streaming response
   * @param messages Array of messages to process
   * @param onToken Token reception callback
   * @param onComplete Completion callback
   * @param onError Error callback
   */
  async runStream(
    messages: LLMMessage[],
    onToken?: (token: string) => void,
    onComplete?: (response: LLMResponse) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    try {
      await this.llm.streamChat(messages, {
        onToken,
        onComplete,
        onError
      });
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      if (onError) {
        onError(errorObj);
      } else {
        throw errorObj;
      }
    }
  }
} 