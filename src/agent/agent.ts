import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { allTools } from "./tools";

// Context schema for runtime configuration
export const contextSchema = z.object({
  userId: z.string().describe("Unique identifier for the user"),
  sessionId: z.string().describe("Current chat session ID"),
  provider: z.enum(["openai", "anthropic"]).describe("AI provider to use"),
  apiKey: z.string().describe("API key for the selected provider"),
  userPreferences: z.object({
    verboseLogging: z.boolean().default(false),
    autoApprove: z.array(z.string()).default([]),
    timeout: z.number().default(30000)
  }).optional()
});

export type AgentContext = z.infer<typeof contextSchema>;

// Create model based on provider
function createModel(provider: "openai" | "anthropic", apiKey: string) {
  switch (provider) {
    case "openai":
      return new ChatOpenAI({
        model: "gpt-4o",
        apiKey,
        temperature: 0.1,
        maxTokens: 4000
      });
    case "anthropic":
      return new ChatAnthropic({
        model: "claude-3-5-sonnet-20241022",
        apiKey,
        temperature: 0.1,
        maxTokens: 4000
      });
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

// System prompt for browser automation
const systemPrompt = `You are a Browser Automation Assistant, an AI agent specialized in automating web browser tasks through natural language instructions.

## Your Capabilities:
- **DOM Inspection**: Analyze web page structure and find elements
- **Element Interaction**: Click, type, select options, hover, drag & drop
- **Navigation**: Navigate URLs, scroll, go back/forward, refresh pages
- **Tab Management**: Open new tabs, switch between tabs, manage multiple browser windows
- **Data Extraction**: Extract text, attributes, and structured data from web pages
- **Human Assistance**: Request help for captchas, logins, or complex decisions
- **Visual Feedback**: Take screenshots to verify actions

## Your Approach:
1. **Understand the Task**: Break down user requests into specific browser actions
2. **Inspect First**: Always get the page DOM before taking actions to understand the current state
3. **Be Precise**: Use specific CSS selectors and verify elements exist before interacting
4. **Step by Step**: Execute actions incrementally and verify results
5. **Ask for Help**: Request human assistance for captchas, authentication, or unclear situations
6. **Provide Feedback**: Explain what you're doing and what you observe

## Safety Guidelines:
- Never perform destructive actions without explicit user consent
- Request human approval for sensitive operations (deleting data, financial transactions)
- Be cautious with form submissions and data entry
- Always verify you're on the correct page before taking actions
- Respect website terms of service and rate limits

## Communication Style:
- Be clear and concise about what you're doing
- Explain any issues or obstacles you encounter
- Provide helpful suggestions when tasks cannot be completed
- Ask clarifying questions when instructions are ambiguous

Start by understanding the user's goal, then inspect the current page state to plan your approach.`;

// Simple agent implementation using just the model and tools
export function createBrowserAutomationAgent(context: AgentContext) {
  const model = createModel(context.provider, context.apiKey);
  
  // Bind tools to the model
  const modelWithTools = model.bindTools(allTools);
  
  return {
    model: modelWithTools,
    tools: allTools,
    systemPrompt,
    invoke: async (input: any) => {
      try {
        // Prepare messages with system prompt
        const messages = [
          new SystemMessage(systemPrompt),
          ...input.messages
        ];
        
        // Get response from model
        const response = await modelWithTools.invoke(messages);
        
        // Check if the model wants to use tools
        if (response.tool_calls && response.tool_calls.length > 0) {
          // For now, we'll handle tool calls in a simple way
          // In a full implementation, you'd want proper tool execution and human approval
          const toolCall = response.tool_calls[0];
          
          // Check if this tool requires human approval
          const sensitiveTools = ['click_element', 'input_text', 'navigate_to_url', 'select_option'];
          const requiresApproval = sensitiveTools.includes(toolCall.name);
          
          if (requiresApproval) {
            // Return with interrupt for human approval
            return {
              messages: [...input.messages, response],
              content: response.content,
              __interrupt__: [{
                value: {
                  action_requests: [{
                    name: toolCall.name,
                    description: `Execute ${toolCall.name} with the provided arguments`,
                    arguments: toolCall.args
                  }]
                }
              }]
            };
          }
        }
        
        return {
          messages: [...input.messages, response],
          content: response.content || 'Task completed successfully.'
        };
      } catch (error) {
        console.error('Agent execution error:', error);
        throw error;
      }
    }
  };
}

// Helper function to create agent configuration
export function createAgentConfig(sessionId: string, userId: string = "default") {
  return {
    configurable: {
      thread_id: `${userId}_${sessionId}`
    }
  };
}

// Response format for structured task completion
export const taskCompletionSchema = z.object({
  success: z.boolean().describe("Whether the task was completed successfully"),
  summary: z.string().describe("Brief summary of what was accomplished"),
  actions_taken: z.array(z.string()).describe("List of actions that were performed"),
  next_steps: z.array(z.string()).optional().describe("Suggested next steps if applicable"),
  issues_encountered: z.array(z.string()).optional().describe("Any problems or obstacles encountered"),
  human_assistance_needed: z.boolean().default(false).describe("Whether human assistance is currently needed")
});

export type TaskCompletion = z.infer<typeof taskCompletionSchema>;

// Create agent with structured output for task completion
export function createStructuredBrowserAgent(context: AgentContext) {
  return createBrowserAutomationAgent(context);
}