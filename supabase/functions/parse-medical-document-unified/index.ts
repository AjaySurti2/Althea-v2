import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ParseRequest {
  sessionId: string;
  fileIds: string[];
  preferredProvider?: "openai" | "anthropic" | "auto";
}

interface ProviderResult {
  success: boolean;
  provider: "openai" | "anthropic";
  data?: any;
  error?: string;
  processingTime: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const requestStartTime = Date.now();

  try {
    console.log("=== Unified Medical Document Parser Started ===");

    const { sessionId, fileIds, preferredProvider = "auto" }: ParseRequest = await req.json();

    if (!sessionId || !fileIds || fileIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing sessionId and fileIds" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📋 Session: ${sessionId}, Files: ${fileIds.length}, Provider: ${preferredProvider}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const openaiKeyAvailable = !!Deno.env.get("OPENAI_API_KEY");
    const anthropicKeyAvailable = !!Deno.env.get("ANTHROPIC_API_KEY");

    console.log(`🔑 API Keys - OpenAI: ${openaiKeyAvailable}, Anthropic: ${anthropicKeyAvailable}`);

    if (!openaiKeyAvailable && !anthropicKeyAvailable) {
      return new Response(
        JSON.stringify({ error: "No API keys configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];
    const errors = [];

    for (const fileId of fileIds) {
      try {
        console.log(`\n📄 Processing file: ${fileId}`);

        const { data: fileData, error: fileError } = await supabase
          .from("files")
          .select("*")
          .eq("id", fileId)
          .single();

        if (fileError || !fileData) {
          console.error("❌ File not found in database");
          errors.push({ fileId, error: "File not found" });
          continue;
        }

        console.log(`📁 File: ${fileData.file_name} (${fileData.file_type})`);

        await updateFileStatus(supabase, fileId, sessionId, fileData.user_id, "pending", 0, {
          file_name: fileData.file_name,
          file_type: fileData.file_type,
        });

        await updateFileStatus(supabase, fileId, sessionId, fileData.user_id, "downloading", 10);

        const { data: downloadData, error: downloadError } = await supabase.storage
          .from("medical-files")
          .download(fileData.storage_path);

        if (downloadError || !downloadData) {
          console.error("❌ Download failed:", downloadError);
          errors.push({ fileId, error: "Download failed" });
          continue;
        }

        const arrayBuffer = await downloadData.arrayBuffer();
        console.log(`✅ Downloaded ${arrayBuffer.byteLength} bytes`);

        let providers: ("openai" | "anthropic")[] = [];
        if (preferredProvider === "openai" && openaiKeyAvailable) {
          providers = anthropicKeyAvailable ? ["openai", "anthropic"] : ["openai"];
        } else if (preferredProvider === "anthropic" && anthropicKeyAvailable) {
          providers = openaiKeyAvailable ? ["anthropic", "openai"] : ["anthropic"];
        } else {
          if (openaiKeyAvailable) providers.push("openai");
          if (anthropicKeyAvailable) providers.push("anthropic");
        }

        console.log(`🎯 Provider order: ${providers.join(" → ")}`);

        let parseResult: ProviderResult | null = null;
        let lastError = "";

        for (const provider of providers) {
          try {
            console.log(`\n🤖 Attempting parse with ${provider.toUpperCase()}...`);
            await updateFileStatus(supabase, fileId, sessionId, fileData.user_id, "parsing", 40);

            if (provider === "openai") {
              parseResult = await parseWithOpenAI(arrayBuffer, fileData, sessionId, supabase);
            } else {
              parseResult = await parseWithAnthropic(arrayBuffer, fileData, sessionId, supabase);
            }

            if (parseResult.success) {
              console.log(`✅ Successfully parsed with ${provider.toUpperCase()}`);
              break;
            } else {
              lastError = parseResult.error || "Unknown error";
              console.warn(`⚠️ ${provider.toUpperCase()} parsing failed: ${lastError}`);
            }
          } catch (providerError: any) {
            lastError = providerError.message;
            console.error(`❌ ${provider.toUpperCase()} error:`, lastError);
          }
        }

        if (!parseResult || !parseResult.success) {
          console.error(`❌ All providers failed. Last error: ${lastError}`);
          errors.push({
            fileId,
            fileName: fileData.file_name,
            error: `All parsing providers failed. Last error: ${lastError}`,
          });

          await updateFileStatus(supabase, fileId, sessionId, fileData.user_id, "failed", 0, {
            error_message: lastError,
          });
          continue;
        }

        await updateFileStatus(supabase, fileId, sessionId, fileData.user_id, "saving", 90);
        await saveUnifiedData(supabase, fileData, sessionId, parseResult);

        await updateFileStatus(supabase, fileId, sessionId, fileData.user_id, "completed", 100, {
          provider_used: parseResult.provider,
          processing_time_ms: parseResult.processingTime,
        });

        results.push({
          fileId: fileData.id,
          fileName: fileData.file_name,
          provider: parseResult.provider,
          success: true,
        });

        console.log(`✅ Successfully processed ${fileData.file_name} with ${parseResult.provider}`);
      } catch (fileError: any) {
        console.error(`❌ Error processing file ${fileId}:`, fileError);
        errors.push({ fileId, error: fileError.message });
      }
    }

    const totalTime = Date.now() - requestStartTime;

    console.log("\n=== Processing Complete ===");
    console.log(`✅ Success: ${results.length}, ❌ Errors: ${errors.length}`);
    console.log(`⏱️  Total time: ${totalTime}ms`);

    return new Response(
      JSON.stringify({
        success: results.length > 0,
        results,
        total_processed: results.length,
        total_requested: fileIds.length,
        total_failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        processingTime: totalTime,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    const totalTime = Date.now() - requestStartTime;
    console.error("=== Unified Parser Error ===", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to parse medical document",
        details: error.toString(),
        processingTime: totalTime,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function parseWithOpenAI(
  arrayBuffer: ArrayBuffer,
  fileData: any,
  sessionId: string,
  supabase: any
): Promise<ProviderResult> {
  const startTime = Date.now();

  try {
    const parseUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/parse-medical-report`;
    const response = await fetch(parseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        sessionId,
        fileIds: [fileData.id],
      }),
    });

    const processingTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        provider: "openai",
        error: `OpenAI parser failed: ${response.status} - ${errorText}`,
        processingTime,
      };
    }

    const result = await response.json();

    if (result.success && result.results && result.results.length > 0) {
      return {
        success: true,
        provider: "openai",
        data: result.results[0],
        processingTime,
      };
    }

    return {
      success: false,
      provider: "openai",
      error: result.error || "OpenAI parsing returned no results",
      processingTime,
    };
  } catch (error: any) {
    return {
      success: false,
      provider: "openai",
      error: error.message,
      processingTime: Date.now() - startTime,
    };
  }
}

async function parseWithAnthropic(
  arrayBuffer: ArrayBuffer,
  fileData: any,
  sessionId: string,
  supabase: any
): Promise<ProviderResult> {
  const startTime = Date.now();

  try {
    const parseUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/parse-documents`;
    const response = await fetch(parseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        sessionId,
        fileIds: [fileData.id],
        customization: {},
      }),
    });

    const processingTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        provider: "anthropic",
        error: `Anthropic parser failed: ${response.status} - ${errorText}`,
        processingTime,
      };
    }

    const result = await response.json();

    if (result.success && result.results && result.results.length > 0) {
      return {
        success: true,
        provider: "anthropic",
        data: result.results[0],
        processingTime,
      };
    }

    return {
      success: false,
      provider: "anthropic",
      error: result.error || "Anthropic parsing returned no results",
      processingTime,
    };
  } catch (error: any) {
    return {
      success: false,
      provider: "anthropic",
      error: error.message,
      processingTime: Date.now() - startTime,
    };
  }
}

async function saveUnifiedData(
  supabase: any,
  fileData: any,
  sessionId: string,
  parseResult: ProviderResult
) {
  console.log(`💾 Data saved by ${parseResult.provider} parser`);
}

async function updateFileStatus(
  supabase: any,
  fileId: string,
  sessionId: string,
  userId: string,
  status: string,
  progress: number,
  additionalData: any = {}
) {
  try {
    await supabase.from("file_processing_status").upsert({
      file_id: fileId,
      session_id: sessionId,
      user_id: userId,
      status,
      progress,
      ...additionalData,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to update file status:", error);
  }
}
