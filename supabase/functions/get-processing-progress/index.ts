import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Get session ID from query params
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "Missing sessionId parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get session processing summary
    const { data: summary, error: summaryError } = await supabase
      .from("session_processing_summary")
      .select("*")
      .eq("session_id", sessionId)
      .single();

    // Get individual file statuses
    const { data: fileStatuses, error: filesError } = await supabase
      .from("file_processing_status")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (summaryError && summaryError.code !== "PGRST116") {
      // PGRST116 is "not found" - acceptable for new sessions
      throw summaryError;
    }

    if (filesError) {
      throw filesError;
    }

    // Calculate real-time progress if no summary exists yet
    const response = {
      sessionId,
      summary: summary || {
        total_files: fileStatuses?.length || 0,
        completed_files: fileStatuses?.filter((f: any) => f.status === "completed").length || 0,
        failed_files: fileStatuses?.filter((f: any) => f.status === "failed").length || 0,
        processing_files: fileStatuses?.filter((f: any) =>
          ["downloading", "extracting", "parsing", "saving"].includes(f.status)
        ).length || 0,
        pending_files: fileStatuses?.filter((f: any) => f.status === "pending").length || 0,
        overall_progress: 0,
        session_status: "pending",
      },
      files: fileStatuses?.map((file: any) => ({
        fileId: file.file_id,
        fileName: file.file_name,
        fileType: file.file_type,
        status: file.status,
        progress: file.progress,
        error: file.error_message,
        processingTime: file.processing_duration_ms,
        attemptNumber: file.attempt_number,
        isRetryable: file.is_retryable,
      })) || [],
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error getting processing progress:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to get processing progress",
        details: error.toString(),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
