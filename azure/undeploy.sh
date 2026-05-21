#!/bin/bash
# ============================================================
# BuddyWork Azure Teardown Script
# Removes individual resources created by deploy.sh.
# IMPORTANT: This script will NEVER delete the resource group
# itself (UseCase3 is shared across teams).
# ============================================================
# Prerequisites:
#   - Azure CLI installed (az login already done)
# ============================================================

# Do NOT use `set -e` here — keep deleting remaining resources
# even if one is already gone.

# ---- VARIABLES (must match deploy.sh) ----
RESOURCE_GROUP="UseCase3"
LOCATION="eastus2"
APP_NAME="buddywork"
STORAGE_ACCOUNT="buddyworkstorage"
FUNCTION_APP="buddywork-api"
COSMOS_ACCOUNT="buddywork-db"
VISION_NAME="buddywork-vision"
VISION_LOCATION="eastus"
FOUNDRY_NAME="usecase3"
FOUNDRY_LOCATION="eastus"

echo "=========================================="
echo "Removing BuddyWork resources from $RESOURCE_GROUP"
echo "(resource group will NOT be deleted)"
echo "=========================================="

echo "--- Deleting Function App: $FUNCTION_APP ---"
az functionapp delete \
  --name $FUNCTION_APP \
  --resource-group $RESOURCE_GROUP \
  || echo "Function app not found or already deleted."

echo "--- Deleting Static Web App: $APP_NAME ---"
az staticwebapp delete \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --yes \
  || echo "Static web app not found or already deleted."

echo "--- Deleting Cosmos DB account: $COSMOS_ACCOUNT ---"
az cosmosdb delete \
  --name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --yes \
  || echo "Cosmos DB account not found or already deleted."

echo "--- Deleting Vision (Cognitive Services): $VISION_NAME ---"
az cognitiveservices account delete \
  --name $VISION_NAME \
  --resource-group $RESOURCE_GROUP \
  || echo "Vision account not found or already deleted."

echo "--- Deleting Foundry AI Services: $FOUNDRY_NAME ---"
az cognitiveservices account delete \
  --name $FOUNDRY_NAME \
  --resource-group $RESOURCE_GROUP \
  || echo "Foundry AI Services account not found or already deleted."

echo "--- Deleting Storage Account: $STORAGE_ACCOUNT ---"
az storage account delete \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --yes \
  || echo "Storage account not found or already deleted."

echo "=========================================="
echo "Purging soft-deleted Cognitive Services"
echo "=========================================="
# Frees the names so they can be reused immediately.

az cognitiveservices account purge \
  --name $VISION_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $VISION_LOCATION \
  || echo "Vision account already purged or not found."

az cognitiveservices account purge \
  --name $FOUNDRY_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $FOUNDRY_LOCATION \
  || echo "Foundry AI Services account already purged or not found."

echo "=========================================="
echo "DONE! BuddyWork resources removed."
echo "Resource group '$RESOURCE_GROUP' was preserved."
echo "=========================================="
