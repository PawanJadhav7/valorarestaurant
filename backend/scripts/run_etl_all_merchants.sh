#!/bin/bash
# Run Bronze→Silver→Gold ETL for all active merchants
set -a && source .env.local && set +a

START="2024-01-01"
END="2026-03-31"

declare -A MERCHANTS=(
  ["0809e4c9-a04c-49d8-a968-92b2d2b5d57f"]="155"
  ["2117e4b7-fc31-485a-94ea-b070d3eb69a5"]="161"
  ["214c219d-eadf-4936-b0dd-0c071a516ea6"]="151"
  ["2a817809-8391-42ef-83a8-c7bb5ba6f634"]="153"
  ["374d33eb-b41a-4074-9dc3-34054c08ce6a"]="158"
  ["467c1346-1a5c-4952-9061-0190dadc662a"]="154"
  ["6ef9aaa3-8d5b-423b-8ec2-d2f62f1219b8"]="157"
  ["95fa1566-ed11-4e00-b77e-d4fee76877c8"]="156"
  ["cc171713-b08c-456b-82f4-465f888cc4a3"]="159"
  ["cc8cb576-e725-49ed-9fef-3355d93f146d"]="160"
  ["e8454026-5159-4d86-9ea9-e2777b7627c8"]="152"
)

# Multi-location tenant
MULTI_TENANT="41f02224-d01f-48be-b0a4-729f2244bb73"
MULTI_LOCATIONS=("101" "139")

echo "🚀 Running ETL for all merchants..."
echo "Date range: $START → $END"
echo ""

# Single location merchants
for TENANT in "${!MERCHANTS[@]}"; do
  LOCATION="${MERCHANTS[$TENANT]}"
  echo "────────────────────────────────────"
  echo "Tenant: $TENANT | Location: $LOCATION"
  
  python scripts/bronze_to_silver_etl.py \
    --tenant-id "$TENANT" \
    --location-id "$LOCATION" \
    --start "$START" \
    --end "$END"
  
  python scripts/silver_to_gold_etl.py \
    --tenant-id "$TENANT" \
    --location-id "$LOCATION" \
    --start "$START" \
    --end "$END"
  
  echo "✅ Done: $TENANT"
  sleep 1
done

# Multi-location tenant
echo "────────────────────────────────────"
echo "Multi-location tenant: $MULTI_TENANT"
for LOCATION in "${MULTI_LOCATIONS[@]}"; do
  echo "  Location: $LOCATION"
  python scripts/bronze_to_silver_etl.py \
    --tenant-id "$MULTI_TENANT" \
    --location-id "$LOCATION" \
    --start "$START" \
    --end "$END"
  
  python scripts/silver_to_gold_etl.py \
    --tenant-id "$MULTI_TENANT" \
    --location-id "$LOCATION" \
    --start "$START" \
    --end "$END"
  
  echo "✅ Done: $MULTI_TENANT location=$LOCATION"
  sleep 1
done

echo ""
echo "🎉 All merchants ETL complete!"
