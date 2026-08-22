import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { assignedTextModel } from "../../../../../../lib/agents/runtime/model-policy";
import { runOpenAIShadow } from "../../../../../../lib/agents/runtime/openai-shadow-adapter";
import { createSupabaseServerClient } from "../../../../../../lib/supabase/server";

const pilotAgents=new Set(["Chief Operations Agent","Support Team Lead Agent"]);
export async function POST(request:Request){
  const supabase=await createSupabaseServerClient();
  const [{data:auth},{data:assurance}]=await Promise.all([supabase.auth.getUser(),supabase.auth.mfa.getAuthenticatorAssuranceLevel()]);
  if(!auth.user)return NextResponse.json({error:"Authentication required."},{status:401});
  if(assurance?.currentLevel!=="aal2")return NextResponse.json({error:"A verified admin session is required."},{status:403});
  const {data:role}=await supabase.from("user_roles").select("role").eq("user_id",auth.user.id).eq("is_active",true).is("revoked_at",null).in("role",["owner","analyst"]).maybeSingle();
  if(!role)return NextResponse.json({error:"Shadow runtime access is not permitted."},{status:403});
  if(process.env.AGENT_SHADOW_RUNTIME_ENABLED!=="true")return NextResponse.json({error:"Shadow runtime is installed but remains disabled until CEO activation."},{status:423});
  let auditAgent="Unknown",auditObjective="";
  try{
    const body=await request.json() as {agentName?:string;objective?:string}; const agentName=body.agentName?.trim()??"",objective=body.objective?.trim()??"";auditAgent=agentName;auditObjective=objective;
    if(!pilotAgents.has(agentName))throw new Error("Only Chief Operations and Support are permitted in the initial shadow pilot.");
    if(objective.length<10||objective.length>4000)throw new Error("Objective must contain 10 to 4,000 characters.");
    const {data:control,error:controlError}=await supabase.from("agent_shadow_controls").select("enabled,max_runs_per_day,max_cost_usd_per_day,max_output_tokens,timeout_ms").eq("control_key","global").single();
    if(controlError||!control)throw new Error("Shadow runtime controls are unavailable.");
    if(!control.enabled)return NextResponse.json({error:"Shadow runtime is database-locked until CEO activation."},{status:423});
    const dayStart=new Date();dayStart.setUTCHours(0,0,0,0);
    const {data:today,error:usageError}=await supabase.from("agent_shadow_runs").select("estimated_cost_usd").gte("created_at",dayStart.toISOString());
    if(usageError)throw new Error("Daily shadow usage could not be verified.");
    if(today.length>=control.max_runs_per_day)throw new Error("The daily shadow-run limit has been reached.");
    const dailyCost=today.reduce((sum,row)=>sum+Number(row.estimated_cost_usd),0);
    if(dailyCost>=Number(control.max_cost_usd_per_day))throw new Error("The daily shadow-cost limit has been reached.");
    const modelId=assignedTextModel(agentName); const result=await runOpenAIShadow({agentName,objective,modelId,maxOutputTokens:control.max_output_tokens,timeoutMs:control.timeout_ms,safetyIdentifier:createHash("sha256").update(auth.user.id).digest("hex").slice(0,64)});
    const outputHash=createHash("sha256").update(result.outputText).digest("hex");
    const {error}=await supabase.from("agent_shadow_runs").insert({agent_name:agentName,model_id:result.modelId,objective,provider_response_id:result.providerResponseId,status:"completed",input_tokens:result.inputTokens,output_tokens:result.outputTokens,total_tokens:result.totalTokens,estimated_cost_usd:result.estimatedCostUsd,duration_ms:result.durationMs,output_excerpt:result.outputText.slice(0,1000),output_sha256:outputHash,requested_by:auth.user.id});
    if(error)throw new Error("The model responded, but its protected audit record could not be saved.");
    return NextResponse.json({mode:"shadow",...result});
  }catch(error){const message=error instanceof Error?error.message:"Shadow run failed.";await supabase.from("agent_shadow_failures").insert({agent_name:auditAgent.slice(0,120),objective_excerpt:auditObjective.slice(0,500),error_code:error instanceof DOMException&&error.name==="AbortError"?"timeout":"runtime_error",error_message:message.slice(0,500),requested_by:auth.user.id});return NextResponse.json({error:message},{status:400});}
}
