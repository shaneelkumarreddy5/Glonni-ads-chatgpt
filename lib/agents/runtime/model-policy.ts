export const approvedModelIds = ["gpt-5-nano", "gpt-5.6-luna", "gpt-image-2"] as const;
export type ApprovedModelId = (typeof approvedModelIds)[number];
export type ModelCapability = "routine_text" | "complex_reasoning" | "image_generation";

export type ApprovedModel = {
  id: ApprovedModelId;
  provider: "openai";
  capability: ModelCapability;
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
  liveEnabled: false;
};

export const approvedModels: Record<ApprovedModelId, ApprovedModel> = {
  "gpt-5-nano": { id: "gpt-5-nano", provider: "openai", capability: "routine_text", inputUsdPerMillion: 0.05, outputUsdPerMillion: 0.4, liveEnabled: false },
  "gpt-5.6-luna": { id: "gpt-5.6-luna", provider: "openai", capability: "complex_reasoning", inputUsdPerMillion: 0.2, outputUsdPerMillion: 1.2, liveEnabled: false },
  "gpt-image-2": { id: "gpt-image-2", provider: "openai", capability: "image_generation", inputUsdPerMillion: 8, outputUsdPerMillion: 30, liveEnabled: false },
};

const lunaAgents = new Set(["Chief Operations Agent", "Fraud & Risk Agent", "Payments & Wallet Agent", "Compliance, KYC & Finance Agent", "Performance Marketing Agent", "Data & Business Analyst Agent", "Technical Operations Agent"]);

export function assignedTextModel(agentName: string): ApprovedModelId {
  return lunaAgents.has(agentName) ? "gpt-5.6-luna" : "gpt-5-nano";
}

export function assertApprovedTextModel(modelId: string, agentName: string) {
  if (!approvedModelIds.includes(modelId as ApprovedModelId)) throw new Error(`Model “${modelId}” is not approved by the CEO model policy.`);
  if (modelId === "gpt-image-2") throw new Error("The image model cannot execute a text-agent task.");
  const assigned = assignedTextModel(agentName);
  if (modelId !== assigned) throw new Error(`${agentName} is assigned to ${assigned}. Model changes require a versioned CEO-approved policy.`);
  return approvedModels[modelId as ApprovedModelId];
}

export const modelPolicyVersion = 1;
export const modelPolicyAssignments = [
  ["Chief Operations Agent", "gpt-5.6-luna"], ["Support Team Lead Agent", "gpt-5-nano"], ["Fraud & Risk Agent", "gpt-5.6-luna"], ["Payments & Wallet Agent", "gpt-5.6-luna"],
  ["Compliance, KYC & Finance Agent", "gpt-5.6-luna"], ["Ads Operations Agent", "gpt-5-nano"], ["Offerwall & Tasks Agent", "gpt-5-nano"], ["Affiliate & Shop Agent", "gpt-5-nano"],
  ["Content Manager Agent", "gpt-5-nano"], ["Creative Production Agent", "gpt-5-nano"], ["Social Media Agent", "gpt-5-nano"], ["Performance Marketing Agent", "gpt-5.6-luna"],
  ["Data & Business Analyst Agent", "gpt-5.6-luna"], ["Technical Operations Agent", "gpt-5.6-luna"], ["Creative Production · Image output", "gpt-image-2"],
] as const;
