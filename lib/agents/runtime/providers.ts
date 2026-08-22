import type { RuntimeProvider } from "./types";

export type ProviderDescriptor = {
  id: RuntimeProvider;
  label: string;
  secretEnvironmentVariable: string;
  defaultModelAlias: string;
  simulatedInputUsdPerMillion: number;
  simulatedOutputUsdPerMillion: number;
};

export const runtimeProviders: Record<RuntimeProvider, ProviderDescriptor> = {
  openai: { id: "openai", label: "OpenAI", secretEnvironmentVariable: "OPENAI_API_KEY", defaultModelAlias: "gpt-5-nano", simulatedInputUsdPerMillion: 0.05, simulatedOutputUsdPerMillion: 0.4 },
  anthropic: { id: "anthropic", label: "Anthropic", secretEnvironmentVariable: "ANTHROPIC_API_KEY", defaultModelAlias: "anthropic-balanced", simulatedInputUsdPerMillion: 3, simulatedOutputUsdPerMillion: 15 },
  gemini: { id: "gemini", label: "Google Gemini", secretEnvironmentVariable: "GOOGLE_GENERATIVE_AI_API_KEY", defaultModelAlias: "gemini-balanced", simulatedInputUsdPerMillion: 1.25, simulatedOutputUsdPerMillion: 5 },
  custom: { id: "custom", label: "Custom provider", secretEnvironmentVariable: "CUSTOM_AI_API_KEY", defaultModelAlias: "custom-default", simulatedInputUsdPerMillion: 2, simulatedOutputUsdPerMillion: 8 },
};

export function providerIsConfigured(provider: RuntimeProvider) {
  return Boolean(process.env[runtimeProviders[provider].secretEnvironmentVariable]);
}
