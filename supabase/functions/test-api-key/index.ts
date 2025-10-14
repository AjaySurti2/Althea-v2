import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

    const result: any = {
      timestamp: new Date().toISOString(),
      apiKeyConfigured: !!anthropicApiKey,
      apiKeyLength: anthropicApiKey ? anthropicApiKey.length : 0,
      apiKeyPrefix: anthropicApiKey ? anthropicApiKey.substring(0, 10) + "..." : "Not configured",
    };

    if (anthropicApiKey) {
      try {
        console.log("Testing Claude API connection...");
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicApiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-3-haiku-20240307",
            max_tokens: 100,
            messages: [
              {
                role: "user",
                content: "Reply with just the word 'SUCCESS' if you can read this.",
              },
            ],
          }),
        });

        result.apiConnectionTest = {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
        };

        if (response.ok) {
          const data = await response.json();
          result.apiConnectionTest.response = data.content[0].text;
          result.apiConnectionTest.message = "Claude API is working correctly!";
        } else {
          const errorText = await response.text();
          result.apiConnectionTest.error = errorText;
          result.apiConnectionTest.message = "Claude API returned an error";
        }
      } catch (apiError: any) {
        result.apiConnectionTest = {
          error: apiError.message,
          details: apiError.toString(),
          message: "Failed to connect to Claude API",
        };
      }
    } else {
      result.message = "ANTHROPIC_API_KEY is not configured in Supabase secrets";
      result.instructions = "Please add ANTHROPIC_API_KEY to your Supabase project secrets";
    }

    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});