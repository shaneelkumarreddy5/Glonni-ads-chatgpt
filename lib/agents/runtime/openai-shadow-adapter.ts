import { approvedModels, assertApprovedTextModel, type ApprovedModelId } from "./model-policy";

type OpenAIResponsePayload = { id?: string; status?: string; output_text?: string; output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>; usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number } };
export type ShadowModelResult = { providerResponseId: string; modelId: ApprovedModelId; outputText: string; inputTokens: number; outputTokens: number; totalTokens: number; estimatedCostUsd: number; durationMs: number };

function extractText(payload: OpenAIResponsePayload) {
  if (payload.output_text) return payload.output_text;
  return (payload.output ?? []).flatMap(item=>item.content ?? []).filter(item=>item.type==="output_text").map(item=>item.text ?? "").join("\n").trim();
}

export async function runOpenAIShadow(args:{agentName:string;objective:string;modelId:string;maxOutputTokens:number;timeoutMs:number;safetyIdentifier:string}):Promise<ShadowModelResult>{
  const model=assertApprovedTextModel(args.modelId,args.agentName);
  const apiKey=process.env.OPENAI_API_KEY;
  if(!apiKey) throw new Error("OpenAI production credential is unavailable.");
  const started=Date.now(),deadline=Date.now()+args.timeoutMs;
  for(let attempt=0;attempt<2;attempt+=1){
    const remaining=deadline-Date.now();if(remaining<=0)throw new Error("The shadow run reached its approved timeout.");
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),remaining);
    try{
      const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",signal:controller.signal,headers:{authorization:`Bearer ${apiKey}`,"content-type":"application/json"},body:JSON.stringify({model:model.id,input:args.objective,instructions:"You are operating in Glonni Ads shadow mode. Analyze and recommend only. Do not claim to execute actions, contact people, change data, spend money, publish content or approve decisions. Return a concise proposed plan for human review.",max_output_tokens:args.maxOutputTokens,tool_choice:"none",store:false,safety_identifier:args.safetyIdentifier,metadata:{runtime_mode:"shadow",agent:args.agentName.slice(0,64)}})});
      const payload=await response.json() as OpenAIResponsePayload & {error?:{message?:string}};
      if(!response.ok){if(attempt===0&&(response.status===429||response.status>=500))continue;throw new Error(payload.error?.message??`OpenAI request failed with status ${response.status}.`);}
    const inputTokens=payload.usage?.input_tokens??0, outputTokens=payload.usage?.output_tokens??0;
    return {providerResponseId:payload.id??"unknown",modelId:model.id,outputText:extractText(payload),inputTokens,outputTokens,totalTokens:payload.usage?.total_tokens??inputTokens+outputTokens,estimatedCostUsd:Number(((inputTokens/1_000_000)*approvedModels[model.id].inputUsdPerMillion+(outputTokens/1_000_000)*approvedModels[model.id].outputUsdPerMillion).toFixed(6)),durationMs:Date.now()-started};
    }finally{clearTimeout(timeout);}
  }
  throw new Error("The shadow model request failed after its single safe retry.");
}
