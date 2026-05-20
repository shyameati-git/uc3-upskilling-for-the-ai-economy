#!/bin/bash
# ============================================================
# BuddyWork Azure Deployment Script
# For Joe + Daniel — run these in order
# ============================================================
# Prerequisites:
#   - Azure CLI installed (az login already done)
#   - Node.js 18+ for React build
#   - Python 3.10+ for Functions
# ============================================================

# ---- VARIABLES (change these) ----
RESOURCE_GROUP="buddywork-hackathon"
LOCATION="eastus"
APP_NAME="buddywork"
STORAGE_ACCOUNT="buddyworkstorage"
FUNCTION_APP="buddywork-api"
COSMOS_ACCOUNT="buddywork-db"
VISION_NAME="buddywork-vision"
OPENAI_NAME="buddywork-openai"

echo "=========================================="
echo "STEP 1: Create Resource Group"
echo "=========================================="
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION

echo "=========================================="
echo "STEP 2: Azure Static Web App (React + Unity)"
echo "=========================================="
# This hosts both the React app AND the Unity WebGL build
# as static files. Free tier is fine for hackathon.

az staticwebapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Free

# After React build, deploy with:
# cd react-app && npm run build
# Copy Unity WebGL build into build/unity-build/
# swa deploy ./build --app-name buddywork

echo "=========================================="
echo "STEP 3: Storage Account (Blob Storage)"
echo "=========================================="
# For shelf photos, task instruction images,
# and any uploaded assets

az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2

# Create containers
az storage container create \
  --name shelf-photos \
  --account-name $STORAGE_ACCOUNT \
  --public-access blob

az storage container create \
  --name task-images \
  --account-name $STORAGE_ACCOUNT \
  --public-access blob

echo "=========================================="
echo "STEP 4: Azure Functions (Python API)"
echo "=========================================="
# Hosts Gauransh's sorting engine + task management API
# Consumption plan = pay per execution, perfect for hackathon

az functionapp create \
  --name $FUNCTION_APP \
  --resource-group $RESOURCE_GROUP \
  --storage-account $STORAGE_ACCOUNT \
  --consumption-plan-location $LOCATION \
  --runtime python \
  --runtime-version 3.10 \
  --functions-version 4 \
  --os-type linux

# Enable CORS for the React app
az functionapp cors add \
  --name $FUNCTION_APP \
  --resource-group $RESOURCE_GROUP \
  --allowed-origins "https://${APP_NAME}.azurestaticapps.net" "http://localhost:3000"

echo "=========================================="
echo "STEP 5: Azure AI Vision (OCR)"
echo "=========================================="
# For reading call numbers from shelf photos
# Free tier: 20 calls/minute, 5K calls/month — plenty for demo

az cognitiveservices account create \
  --name $VISION_NAME \
  --resource-group $RESOURCE_GROUP \
  --kind ComputerVision \
  --sku F0 \
  --location $LOCATION \
  --yes

# Get the key and endpoint (save these!)
echo "--- Vision API Key ---"
az cognitiveservices account keys list \
  --name $VISION_NAME \
  --resource-group $RESOURCE_GROUP \
  --query key1 -o tsv

echo "--- Vision Endpoint ---"
az cognitiveservices account show \
  --name $VISION_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.endpoint -o tsv

echo "=========================================="
echo "STEP 6: Azure OpenAI (Foundry LLMs)"
echo "=========================================="
# For smart task generation, voice script writing,
# and adaptive coaching intelligence
# NOTE: Requires approved Azure OpenAI access

az cognitiveservices account create \
  --name $OPENAI_NAME \
  --resource-group $RESOURCE_GROUP \
  --kind OpenAI \
  --sku S0 \
  --location $LOCATION \
  --yes

# Deploy GPT-4o-mini model (fast, cheap, good enough)
az cognitiveservices account deployment create \
  --name $OPENAI_NAME \
  --resource-group $RESOURCE_GROUP \
  --deployment-name gpt-4o-mini \
  --model-name gpt-4o-mini \
  --model-version "2024-07-18" \
  --model-format OpenAI \
  --sku-name Standard \
  --sku-capacity 10

echo "--- OpenAI Key ---"
az cognitiveservices account keys list \
  --name $OPENAI_NAME \
  --resource-group $RESOURCE_GROUP \
  --query key1 -o tsv

echo "--- OpenAI Endpoint ---"
az cognitiveservices account show \
  --name $OPENAI_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.endpoint -o tsv

echo "=========================================="
echo "STEP 7: Cosmos DB (Worker Data)"
echo "=========================================="
# Stores worker profiles, celebration preferences,
# task completion logs, and progress streaks
# Serverless = pay per request, ideal for hackathon

az cosmosdb create \
  --name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --locations regionName=$LOCATION \
  --capabilities EnableServerless

# Create database and containers
az cosmosdb sql database create \
  --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --name buddywork

az cosmosdb sql container create \
  --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --database-name buddywork \
  --name workers \
  --partition-key-path "/workerId"

az cosmosdb sql container create \
  --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --database-name buddywork \
  --name task-logs \
  --partition-key-path "/workerId"

echo "=========================================="
echo "STEP 8: Set Function App Settings"
echo "=========================================="
# Wire up all the API keys as environment variables

VISION_KEY=$(az cognitiveservices account keys list --name $VISION_NAME --resource-group $RESOURCE_GROUP --query key1 -o tsv)
VISION_ENDPOINT=$(az cognitiveservices account show --name $VISION_NAME --resource-group $RESOURCE_GROUP --query properties.endpoint -o tsv)
OPENAI_KEY=$(az cognitiveservices account keys list --name $OPENAI_NAME --resource-group $RESOURCE_GROUP --query key1 -o tsv)
OPENAI_ENDPOINT=$(az cognitiveservices account show --name $OPENAI_NAME --resource-group $RESOURCE_GROUP --query properties.endpoint -o tsv)
COSMOS_CONNECTION=$(az cosmosdb keys list --name $COSMOS_ACCOUNT --resource-group $RESOURCE_GROUP --type connection-strings --query connectionStrings[0].connectionString -o tsv)
STORAGE_CONNECTION=$(az storage account show-connection-string --name $STORAGE_ACCOUNT --resource-group $RESOURCE_GROUP --query connectionString -o tsv)

az functionapp config appsettings set \
  --name $FUNCTION_APP \
  --resource-group $RESOURCE_GROUP \
  --settings \
    VISION_KEY="$VISION_KEY" \
    VISION_ENDPOINT="$VISION_ENDPOINT" \
    OPENAI_KEY="$OPENAI_KEY" \
    OPENAI_ENDPOINT="$OPENAI_ENDPOINT" \
    COSMOS_CONNECTION="$COSMOS_CONNECTION" \
    STORAGE_CONNECTION="$STORAGE_CONNECTION"

echo "=========================================="
echo "DONE! All Azure resources created."
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Deploy Functions:  cd api && func azure functionapp publish $FUNCTION_APP"
echo "2. Build React:       cd react-app && npm run build"
echo "3. Copy Unity build:  cp -r unity-build/ react-app/build/unity-build/"
echo "4. Deploy frontend:   swa deploy ./react-app/build --app-name $APP_NAME"
echo ""
echo "Your app will be live at:"
echo "https://${APP_NAME}.azurestaticapps.net"
