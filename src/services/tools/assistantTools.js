import { groqToolSchemas, executeTool, parseToolArgs } from '../assistant/toolRegistry.js';

/** @deprecated Use groqToolSchemas() from toolRegistry. Kept so existing Groq wiring stays stable. */
export const LIVE_TOOLS = groqToolSchemas();

export async function runLiveTool(name, args, keys, runtime) {
  return executeTool(name, args, { keys, runtime });
}

export { parseToolArgs };
