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
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    const result: any = {
      timestamp: new Date().toISOString(),
      apiKeyConfigured: !!openaiApiKey,
      apiKeyLength: openaiApiKey ? openaiApiKey.length : 0,
      apiKeyPrefix: openaiApiKey ? openaiApiKey.substring(0, 10) + "..." : "Not configured",
    };

    if (openaiApiKey) {
      try {
        console.log("Testing OpenAI API connection...");
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            max_tokens: 50,
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
          result.apiConnectionTest.response = data.choices[0].message.content;
          result.apiConnectionTest.message = "OpenAI API is working correctly!";
        } else {
          const errorText = await response.text();
          result.apiConnectionTest.error = errorText;
          result.apiConnectionTest.message = "OpenAI API returned an error";
        }
      } catch (apiError: any) {
        result.apiConnectionTest = {
          error: apiError.message,
          details: apiError.toString(),
          message: "Failed to connect to OpenAI API",
        };
      }
    } else {
      result.message = "OPENAI_API_KEY is not configured in Supabase secrets";
      result.instructions = "Please add OPENAI_API_KEY to your Supabase project secrets";
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
