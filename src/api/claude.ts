import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import type { Settings } from "../types";

export class ApiKeyMissing extends Error {
  constructor() {
    super("Chưa có API key. Vào Cài đặt để dán key.");
    this.name = "ApiKeyMissing";
  }
}

export interface ChatOptions<T> {
  system: string;
  messages: Anthropic.MessageParam[];
  schema: z.ZodType<T>;
  settings: Settings;
}

/** One call to Claude that returns a value validated against `schema`. Retries once on a parse failure. */
export async function chat<T>({ system, messages, schema, settings }: ChatOptions<T>): Promise<T> {
  if (!settings.apiKey.trim()) throw new ApiKeyMissing();
  const client = new Anthropic({ apiKey: settings.apiKey.trim(), dangerouslyAllowBrowser: true, maxRetries: 2 });
  const run = () =>
    client.messages.parse({
      model: settings.model,
      max_tokens: 8192,
      system,
      messages,
      output_config: { format: zodOutputFormat(schema), effort: "medium" },
    });
  // A schema/JSON failure is thrown by the SDK as a plain AnthropicError (not an APIError).
  // Retry that once; API errors (auth, rate limit, network) are translated and thrown at once.
  const attempt = async (): Promise<T | null> => {
    try {
      return (await run()).parsed_output;
    } catch (e) {
      if (e instanceof Anthropic.APIError) throw translate(e);
      return null;
    }
  };
  let out = await attempt();
  if (out == null) out = await attempt();
  if (out == null) throw new Error("Claude trả về sai định dạng. Thử lại.");
  return out;
}

function translate(e: unknown): Error {
  if (e instanceof Anthropic.AuthenticationError) return new Error("API key sai hoặc hết hạn.");
  if (e instanceof Anthropic.RateLimitError) return new Error("Gọi quá nhanh. Chờ một chút rồi thử lại.");
  if (e instanceof Anthropic.BadRequestError) return new Error(`Yêu cầu không hợp lệ: ${e.message}`);
  if (e instanceof Anthropic.APIConnectionError) return new Error("Không có mạng hoặc không kết nối được Claude.");
  if (e instanceof Anthropic.APIError) return new Error(`Lỗi Claude (${e.status}): ${e.message}`);
  return e instanceof Error ? e : new Error(String(e));
}
