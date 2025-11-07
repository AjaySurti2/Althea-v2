#!/bin/bash

# Deploy Edge Function to Supabase
# This script deploys the generate-health-report Edge Function

echo "================================================"
echo "Deploying Edge Function: generate-health-report"
echo "================================================"
echo ""

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

echo "📦 Deploying function..."
npx supabase functions deploy generate-health-report

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Edge Function deployed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Test the 'Download Report' functionality"
    echo "2. Verify no CORS or database errors occur"
    echo "3. Check that report titles are generated correctly"
else
    echo ""
    echo "❌ Deployment failed. Please check the error above."
    echo ""
    echo "Troubleshooting:"
    echo "1. Ensure you're logged in: npx supabase login"
    echo "2. Check your project is linked: npx supabase link"
    echo "3. Verify your credentials are correct"
    echo ""
    echo "See EDGE_FUNCTION_DEPLOYMENT_GUIDE.md for alternative deployment methods."
fi
