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

# Exit immediately if any command fails
set -e

# ---- VARIABLES (change these) ----
# Using existing shared resource group UseCase3 — do NOT create or delete it.
RESOURCE_GROUP="UseCase3"
LOCATION="eastus2"
STATIC_WEB_APP_LOCATION="eastus2"
APP_NAME="buddywork"
STORAGE_ACCOUNT="buddyworkstorage"
FUNCTION_APP="buddywork-api"
PYTHON_RUNTIME_VERSION="3.12"
COSMOS_ACCOUNT="buddywork-db"
# Toggle for not-yet-used services. Set to "true" once code reads/writes Cosmos.
DEPLOY_FUTURE_FEATURES="false"
VISION_NAME="buddywork-vision"
VISION_LOCATION="eastus"
FOUNDRY_NAME="usecase3"
FOUNDRY_LOCATION="eastus"
FOUNDRY_DEPLOYMENT="gpt-5-4-mini"
FOUNDRY_MODEL_NAME="gpt-5.4-mini"
FOUNDRY_MODEL_VERSION="2026-03-17"

echo "=========================================="
echo "STEP 1: Verify Resource Group Exists"
echo "=========================================="
# Using the existing shared UseCase3 resource group; do not create it.
if [[ "$(az group exists --name $RESOURCE_GROUP)" != "true" ]]; then
  echo "ERROR: Resource group '$RESOURCE_GROUP' does not exist. Aborting."
  exit 1
fi
echo "Using existing resource group: $RESOURCE_GROUP"

echo "=========================================="
echo "STEP 2: Azure Static Web App (React + Unity)"
echo "=========================================="
# This hosts both the React app AND the Unity WebGL build
# as static files. Free tier is fine for hackathon.

az staticwebapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $STATIC_WEB_APP_LOCATION \
  --sku Free

# After React build, deploy with:
# npm run build
# Copy Unity WebGL build into build/unity-build/
# swa deploy ./build --app-name buddywork

echo "=========================================="
echo "STEP 3: Storage Account (Blob Storage)"
echo "=========================================="
# For shelf photos, task instruction images,
# and any uploaded assets

ORIGINAL_STORAGE_ACCOUNT=$STORAGE_ACCOUNT
LOCATION_SUFFIX=$(echo "$LOCATION" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9')
SUBSCRIPTION_SUFFIX=$(az account show --query id -o tsv | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9' | cut -c1-6)
STORAGE_PREFIX=$(echo "${RESOURCE_GROUP}${LOCATION_SUFFIX}storage" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9' | cut -c1-18)
FALLBACK_STORAGE_ACCOUNT=$(echo "${STORAGE_PREFIX}${SUBSCRIPTION_SUFFIX}" | cut -c1-24)
STORAGE_CANDIDATES=("$STORAGE_ACCOUNT" "$FALLBACK_STORAGE_ACCOUNT")
STORAGE_RESOURCE_GROUP=""

for STORAGE_CANDIDATE in "${STORAGE_CANDIDATES[@]}"; do
  CANDIDATE_RESOURCE_GROUP=$(az storage account list \
    --query "[?name=='$STORAGE_CANDIDATE'].resourceGroup | [0]" -o tsv)

  if [[ -n "$CANDIDATE_RESOURCE_GROUP" ]]; then
    CANDIDATE_LOCATION=$(az storage account show \
      --name "$STORAGE_CANDIDATE" \
      --resource-group "$CANDIDATE_RESOURCE_GROUP" \
      --query primaryLocation -o tsv)

    if [[ "$CANDIDATE_LOCATION" == "$LOCATION" ]]; then
      STORAGE_ACCOUNT=$STORAGE_CANDIDATE
      STORAGE_RESOURCE_GROUP=$CANDIDATE_RESOURCE_GROUP
      echo "Storage account '$STORAGE_ACCOUNT' already exists in '$LOCATION'. Reusing it."
      break
    fi

    echo "Storage account '$STORAGE_CANDIDATE' exists in '$CANDIDATE_LOCATION'. Skipping it because Function App storage must be in '$LOCATION'."
    continue
  fi

  STORAGE_NAME_AVAILABLE=$(az storage account check-name \
    --name "$STORAGE_CANDIDATE" \
    --query nameAvailable -o tsv)

  if [[ "$STORAGE_NAME_AVAILABLE" == "true" ]]; then
    STORAGE_ACCOUNT=$STORAGE_CANDIDATE
    echo "Creating storage account '$STORAGE_ACCOUNT' in '$LOCATION'."
    az storage account create \
      --name "$STORAGE_ACCOUNT" \
      --resource-group "$RESOURCE_GROUP" \
      --location "$LOCATION" \
      --sku Standard_LRS \
      --kind StorageV2
    STORAGE_RESOURCE_GROUP=$RESOURCE_GROUP
    break
  fi

  echo "Storage account '$STORAGE_CANDIDATE' is not available in this subscription. Trying the next candidate."
done

while [[ -z "$STORAGE_RESOURCE_GROUP" ]]; do
  STORAGE_ACCOUNT=$(echo "${STORAGE_PREFIX}${RANDOM}" | cut -c1-24)
  STORAGE_NAME_AVAILABLE=$(az storage account check-name \
    --name "$STORAGE_ACCOUNT" \
    --query nameAvailable -o tsv)

  if [[ "$STORAGE_NAME_AVAILABLE" == "true" ]]; then
    echo "Creating storage account '$STORAGE_ACCOUNT' in '$LOCATION'."
    az storage account create \
      --name "$STORAGE_ACCOUNT" \
      --resource-group "$RESOURCE_GROUP" \
      --location "$LOCATION" \
      --sku Standard_LRS \
      --kind StorageV2
    STORAGE_RESOURCE_GROUP=$RESOURCE_GROUP
  fi
done

if [[ "$STORAGE_ACCOUNT" != "$ORIGINAL_STORAGE_ACCOUNT" ]]; then
  echo "Using storage account '$STORAGE_ACCOUNT' instead of '$ORIGINAL_STORAGE_ACCOUNT'."
fi

STORAGE_ACCOUNT_ID=$(az storage account show \
  --name $STORAGE_ACCOUNT \
  --resource-group $STORAGE_RESOURCE_GROUP \
  --query id -o tsv)

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

if az functionapp show --name "$FUNCTION_APP" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  FUNCTION_STORAGE_ACCOUNT=$(az functionapp config appsettings list \
    --name "$FUNCTION_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --query "[?name=='AzureWebJobsStorage'].value | [0]" -o tsv | sed -E 's/.*AccountName=([^;]+).*/\1/')
  FUNCTION_STORAGE_LOCATION=$(az storage account list \
    --query "[?name=='$FUNCTION_STORAGE_ACCOUNT'].primaryLocation | [0]" -o tsv)
  FUNCTION_LINUX_FX=$(az functionapp show \
    --name "$FUNCTION_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --query "siteConfig.linuxFxVersion" -o tsv)
  DESIRED_LINUX_FX="Python|$PYTHON_RUNTIME_VERSION"

  RECREATE_REASON=""
  if [[ -n "$FUNCTION_STORAGE_LOCATION" && "$FUNCTION_STORAGE_LOCATION" != "$LOCATION" ]]; then
    RECREATE_REASON="storage region '$FUNCTION_STORAGE_LOCATION' != Function App region '$LOCATION'"
  elif [[ -n "$FUNCTION_LINUX_FX" && "$FUNCTION_LINUX_FX" != "$DESIRED_LINUX_FX" ]]; then
    RECREATE_REASON="runtime '$FUNCTION_LINUX_FX' != desired '$DESIRED_LINUX_FX'"
  fi

  if [[ -n "$RECREATE_REASON" ]]; then
    echo "Function App '$FUNCTION_APP' needs recreation: $RECREATE_REASON"
    az functionapp delete \
      --name "$FUNCTION_APP" \
      --resource-group "$RESOURCE_GROUP"
  else
    echo "Function App '$FUNCTION_APP' already exists with matching region and runtime. Reusing it."
  fi
fi

if ! az functionapp show --name "$FUNCTION_APP" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  MSYS_NO_PATHCONV=1 az functionapp create \
    --name $FUNCTION_APP \
    --resource-group $RESOURCE_GROUP \
    --storage-account "$STORAGE_ACCOUNT_ID" \
    --consumption-plan-location $LOCATION \
    --runtime python \
    --runtime-version $PYTHON_RUNTIME_VERSION \
    --functions-version 4 \
    --os-type linux
fi

# Enable CORS for the React app
SWA_HOSTNAME=$(az staticwebapp show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query defaultHostname -o tsv)
az functionapp cors add \
  --name $FUNCTION_APP \
  --resource-group $RESOURCE_GROUP \
  --allowed-origins "https://${SWA_HOSTNAME}" "http://localhost:3000"

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
  --location $VISION_LOCATION \
  --yes

echo "--- Vision Endpoint ---"
az cognitiveservices account show \
  --name $VISION_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.endpoint -o tsv

echo "=========================================="
echo "STEP 6: Azure AI Foundry (GPT-5.4 mini)"
echo "=========================================="
# For smart task generation, voice script writing,
# and adaptive coaching intelligence
# Creates a Foundry-compatible Azure AI Services resource.
# NOTE: AIServices supports S0 only; model availability depends on region/quota.

if az cognitiveservices account show --name $FOUNDRY_NAME --resource-group $RESOURCE_GROUP >/dev/null 2>&1; then
  EXISTING_FOUNDRY_LOCATION=$(az cognitiveservices account show \
    --name $FOUNDRY_NAME \
    --resource-group $RESOURCE_GROUP \
    --query location -o tsv)

  if [[ "$EXISTING_FOUNDRY_LOCATION" != "$FOUNDRY_LOCATION" ]]; then
    echo "ERROR: Foundry resource '$FOUNDRY_NAME' exists in '$EXISTING_FOUNDRY_LOCATION', but FOUNDRY_LOCATION is '$FOUNDRY_LOCATION'."
    echo "Update FOUNDRY_LOCATION near the top of this script to match the existing resource."
    exit 1
  fi

  echo "Foundry resource '$FOUNDRY_NAME' already exists in '$FOUNDRY_LOCATION'. Reusing it."
else
  az cognitiveservices account create \
    --name $FOUNDRY_NAME \
    --resource-group $RESOURCE_GROUP \
    --kind AIServices \
    --sku S0 \
    --location $FOUNDRY_LOCATION \
    --yes
fi

# Deploy GPT-5.4 mini model for adaptive coaching
az cognitiveservices account deployment create \
  --name $FOUNDRY_NAME \
  --resource-group $RESOURCE_GROUP \
  --deployment-name $FOUNDRY_DEPLOYMENT \
  --model-name $FOUNDRY_MODEL_NAME \
  --model-version $FOUNDRY_MODEL_VERSION \
  --model-format OpenAI \
  --sku-name GlobalStandard \
  --sku-capacity 10

echo "--- Foundry Endpoint ---"
az cognitiveservices account show \
  --name $FOUNDRY_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.endpoint -o tsv

echo "=========================================="
echo "STEP 7: Cosmos DB (Worker Data)"
echo "=========================================="
# Stores worker profiles, celebration preferences,
# task completion logs, and progress streaks
# Serverless = pay per request, ideal for hackathon

if [[ "$DEPLOY_FUTURE_FEATURES" == "true" ]]; then
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

  MSYS_NO_PATHCONV=1 az cosmosdb sql container create \
    --account-name $COSMOS_ACCOUNT \
    --resource-group $RESOURCE_GROUP \
    --database-name buddywork \
    --name workers \
    --partition-key-path "/workerId"

  MSYS_NO_PATHCONV=1 az cosmosdb sql container create \
    --account-name $COSMOS_ACCOUNT \
    --resource-group $RESOURCE_GROUP \
    --database-name buddywork \
    --name task-logs \
    --partition-key-path "/workerId"
else
  echo "Skipping Cosmos DB (DEPLOY_FUTURE_FEATURES=false)."
fi

echo "=========================================="
echo "STEP 8: Set Function App Settings"
echo "=========================================="
# Wire up all the API keys as environment variables

VISION_KEY=$(az cognitiveservices account keys list --name $VISION_NAME --resource-group $RESOURCE_GROUP --query key1 -o tsv)
VISION_ENDPOINT=$(az cognitiveservices account show --name $VISION_NAME --resource-group $RESOURCE_GROUP --query properties.endpoint -o tsv)
FOUNDRY_KEY=$(az cognitiveservices account keys list --name $FOUNDRY_NAME --resource-group $RESOURCE_GROUP --query key1 -o tsv)
FOUNDRY_ENDPOINT=$(az cognitiveservices account show --name $FOUNDRY_NAME --resource-group $RESOURCE_GROUP --query properties.endpoint -o tsv)
if [[ "$DEPLOY_FUTURE_FEATURES" == "true" ]]; then
  COSMOS_CONNECTION=$(az cosmosdb keys list --name $COSMOS_ACCOUNT --resource-group $RESOURCE_GROUP --type connection-strings --query connectionStrings[0].connectionString -o tsv)
else
  COSMOS_CONNECTION=""
fi
STORAGE_CONNECTION=$(az storage account show-connection-string --name $STORAGE_ACCOUNT --resource-group $STORAGE_RESOURCE_GROUP --query connectionString -o tsv)

az functionapp config appsettings set \
  --name $FUNCTION_APP \
  --resource-group $RESOURCE_GROUP \
  --settings \
    VISION_KEY="$VISION_KEY" \
    VISION_ENDPOINT="$VISION_ENDPOINT" \
    FOUNDRY_KEY="$FOUNDRY_KEY" \
    FOUNDRY_ENDPOINT="$FOUNDRY_ENDPOINT" \
    FOUNDRY_DEPLOYMENT="$FOUNDRY_DEPLOYMENT" \
    FOUNDRY_MODEL="$FOUNDRY_DEPLOYMENT" \
    FOUNDRY_MODEL_NAME="$FOUNDRY_MODEL_NAME" \
    COSMOS_CONNECTION="$COSMOS_CONNECTION" \
    STORAGE_CONNECTION="$STORAGE_CONNECTION"

echo "=========================================="
echo "DONE! All Azure resources created."
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Deploy Functions:  (cd azure && func azure functionapp publish $FUNCTION_APP)"
echo "2. Build React:       npm run build"
echo "3. Copy Unity build:  cp -r unity-build/ build/unity-build/"
echo "4. Deploy frontend:   swa deploy ./build --app-name $APP_NAME"
echo ""
echo "Your app will be live at:"
echo "https://${SWA_HOSTNAME}"
