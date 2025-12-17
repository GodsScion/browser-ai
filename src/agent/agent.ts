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
        model: "gpt-4o-mini",
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
2. **Be Proactive**: When a user asks for information (like weather), automatically complete all necessary steps to get that information
3. **Inspect First**: Always get the page DOM before taking actions to understand the current state
4. **Be Precise**: Use specific CSS selectors and verify elements exist before interacting
5. **Complete the Task**: Don't stop halfway - if you navigate to a site, extract the requested information
6. **Step by Step**: Execute actions incrementally and verify results
7. **Ask for Help**: Request human assistance for captchas, authentication, or unclear situations
8. **Provide Feedback**: Explain what you're doing and what you observe

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

Start by understanding the user's goal, then inspect the current page state to plan your approach.

## Common Task Examples:
- **Weather Queries**: When asked about weather, navigate to a weather site, search for the location, extract the current conditions, and report back with specific details (temperature, conditions, etc.)
- **Information Lookup**: When asked to find information, navigate to appropriate sites, search, extract relevant data, and provide a comprehensive answer
- **Multi-step Tasks**: Complete all logical steps automatically without asking for permission at each step

Remember: Your goal is to provide complete, useful answers by actually performing the browser automation, not just navigating to sites.`;

// Simple agent implementation using just the model and tools
export function createBrowserAutomationAgent(context: AgentContext) {
  console.log('Creating model with provider:', context.provider)
  const model = createModel(context.provider, context.apiKey);
  console.log('Model created successfully')
  
  // Re-enable tools now that basic AI processing works
  const modelWithTools = model.bindTools(allTools);
  console.log('Tools bound successfully')
  
  return {
    model: modelWithTools,
    tools: allTools,
    systemPrompt,
    invoke: async (input: any) => {
      try {
        console.log('Agent invoke called with input:', input)
        
        // Prepare messages with system prompt
        const messages = [
          new SystemMessage(systemPrompt),
          ...input.messages
        ];
        
        console.log('Prepared messages:', messages.length, 'messages')
        console.log('Calling model.invoke...')
        
        // Get response from model with tools
        const response = await modelWithTools.invoke(messages);
        
        console.log('Model response received:', response)
        
        // Check if the model wants to use tools
        if (response.tool_calls && response.tool_calls.length > 0) {
          console.log('Model requested tool calls:', response.tool_calls)
          
          // For now, we'll handle tool calls in a simple way
          // In a full implementation, you'd want proper tool execution and human approval
          const toolCall = response.tool_calls[0];
          
          // Disable human-in-the-loop for now - let AI execute all tools automatically
          let requiresApproval = false; // Never require approval
          
          if (requiresApproval) {
            console.log('Tool requires approval:', toolCall.name)
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
          } else {
            console.log('Tool does not require approval, executing:', toolCall.name)
            
            // Execute the tool directly for non-sensitive actions
            try {
              // Find the tool function
              const tool = allTools.find(t => t.name === toolCall.name);
              if (tool) {
                console.log('Executing tool:', toolCall.name, 'with args:', toolCall.args)
                const toolResult = await (tool as any).invoke(toolCall.args);
                console.log('Tool execution result:', toolResult)
                
                // Return the tool result as the response
                return {
                  messages: [...input.messages, response],
                  content: `I executed ${toolCall.name} and got: ${toolResult}`
                };
              } else {
                console.error('Tool not found:', toolCall.name)
                return {
                  messages: [...input.messages, response],
                  content: `Tool ${toolCall.name} not found.`
                };
              }
            } catch (toolError) {
              console.error('Tool execution failed:', toolError)
              return {
                messages: [...input.messages, response],
                content: `Tool execution failed: ${toolError instanceof Error ? toolError.message : String(toolError)}`
              };
            }
          }
        }
        
        return {
          messages: [...input.messages, response],
          content: response.content || 'Task completed successfully.'
        };
      } catch (error) {
        console.error('Agent execution error:', error);
        console.error('Error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : 'No stack trace'
        });
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