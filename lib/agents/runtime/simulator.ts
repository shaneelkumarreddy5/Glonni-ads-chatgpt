import { runtimeProviders } from "./providers";
import type { RuntimeControls, RuntimeRequest, RuntimeResult, RuntimeTrace } from "./types";

export const simulationControls: RuntimeControls = { mode: "simulation", emergencyPaused: false, liveExecutionEnabled: false, maxTokenBudget: 20_000, maxTimeoutMs: 60_000, maxRetries: 2 };

function estimateTokens(text: string) { return Math.max(1, Math.ceil(text.trim().length / 4)); }

export function simulateAgentRun(request: RuntimeRequest, controls: RuntimeControls = simulationControls): RuntimeResult {
  const traces: RuntimeTrace[] = [];
  const add = (stage: RuntimeTrace["stage"], status: RuntimeTrace["status"], detail: string) => traces.push({ order: traces.length + 1, stage, status, detail });
  const route = ["CEO policy", "Chief Operations Agent", request.mainAgent, ...(request.subagent ? [request.subagent] : [])];
  if (controls.emergencyPaused) {
    add("policy", "blocked", "Emergency pause blocks all new runtime work.");
    return { runId: crypto.randomUUID(), mode: controls.mode, status: "blocked", route, estimatedInputTokens: 0, estimatedOutputTokens: 0, estimatedCostUsd: 0, approvalRequired: false, summary: "Run blocked by emergency pause.", traces };
  }
  if (controls.mode !== "simulation" || controls.liveExecutionEnabled) throw new Error("Step 17.16.1 permits simulation mode only.");
  if (!request.objective.trim()) throw new Error("An objective is required.");
  if (request.tokenBudget < 1 || request.tokenBudget > controls.maxTokenBudget) throw new Error(`Token budget must be between 1 and ${controls.maxTokenBudget}.`);
  if (request.timeoutMs > controls.maxTimeoutMs || request.maxRetries > controls.maxRetries) throw new Error("Runtime limits exceed the approved simulation policy.");
  add("policy", "passed", `Simulation-only policy applied; ${request.tokenBudget.toLocaleString()} token ceiling, ${request.timeoutMs / 1000}s timeout and ${request.maxRetries} retries.`);
  add("route", "simulated", route.join(" → "));
  add("instruction", "simulated", `Instruction hierarchy snapshot${request.instructionVersion ? ` v${request.instructionVersion}` : " (latest approved)"} attached without modifying saved instructions.`);
  const input = Math.min(request.tokenBudget, estimateTokens(request.objective) + 620);
  const output = Math.min(Math.max(180, Math.ceil(input * 0.55)), Math.max(1, request.tokenBudget - input));
  const provider = runtimeProviders[request.provider];
  const cost = (input / 1_000_000) * provider.simulatedInputUsdPerMillion + (output / 1_000_000) * provider.simulatedOutputUsdPerMillion;
  add("provider", "simulated", `${provider.label} adapter using model alias “${request.modelAlias}”; no provider request was sent and no tokens were consumed.`);
  const approvalRequired = request.approvalRisk !== "none";
  add("approval", approvalRequired ? "waiting" : "passed", approvalRequired ? `${request.approvalRisk === "ceo" ? "CEO" : "Department owner"} approval gate created before execution.` : "No protected action detected in this simulation.");
  add("result", "simulated", "Plan, route, limits and estimated usage generated for review.");
  return { runId: crypto.randomUUID(), mode: "simulation", status: approvalRequired ? "waiting_approval" : "simulated", route, estimatedInputTokens: input, estimatedOutputTokens: output, estimatedCostUsd: Number(cost.toFixed(6)), approvalRequired, summary: approvalRequired ? "Simulation completed; execution would wait for human approval." : "Simulation completed safely; live execution remains disabled.", traces };
}
