export type RuntimeProvider = "openai" | "anthropic" | "gemini" | "custom";
export type RuntimeMode = "simulation" | "live";
export type ApprovalRisk = "none" | "department" | "ceo";

export type RuntimeRequest = {
  objective: string;
  mainAgent: string;
  subagent?: string;
  provider: RuntimeProvider;
  modelAlias: string;
  tokenBudget: number;
  timeoutMs: number;
  maxRetries: number;
  approvalRisk: ApprovalRisk;
  instructionVersion?: number;
};

export type RuntimeTrace = {
  order: number;
  stage: "policy" | "route" | "instruction" | "provider" | "approval" | "result";
  status: "passed" | "simulated" | "waiting" | "blocked";
  detail: string;
};

export type RuntimeResult = {
  runId: string;
  mode: RuntimeMode;
  status: "simulated" | "waiting_approval" | "blocked";
  route: string[];
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
  approvalRequired: boolean;
  summary: string;
  traces: RuntimeTrace[];
};

export type RuntimeControls = {
  mode: RuntimeMode;
  emergencyPaused: boolean;
  liveExecutionEnabled: boolean;
  maxTokenBudget: number;
  maxTimeoutMs: number;
  maxRetries: number;
};
