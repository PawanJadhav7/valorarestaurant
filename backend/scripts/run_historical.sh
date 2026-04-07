#!/bin/bash
# ============================================================
# Valora AI — Historical Data Generation Runner
# Runs all 200 steps automatically, one at a time
# Logs each step result and skips already-completed steps
#
# Usage:
#   chmod +x run_historical.sh
#   ./run_historical.sh
#
# Resume from specific step:
#   ./run_historical.sh --from-step 10
#
# Run specific year only:
#   ./run_historical.sh --year 2025
# ============================================================

set -e

SCRIPT="python scripts/generate_historical.py"
BATCH_SIZE=50
LOG_FILE="logs/historical_generation.log"
PROGRESS_FILE="logs/historical_progress.txt"
FROM_STEP=1
YEAR_FILTER=""

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --from-step) FROM_STEP="$2"; shift 2 ;;
    --year)      YEAR_FILTER="$2"; shift 2 ;;
    *) shift ;;
  esac
done

# Create logs dir
mkdir -p logs

echo "============================================================"
echo "VALORA AI — HISTORICAL DATA GENERATOR"
echo "Started: $(date)"
echo "From step: $FROM_STEP"
echo "Log: $LOG_FILE"
echo "============================================================"

# ─────────────────────────────────────────────
# ALL 200 STEPS
# Format: STEP|YEAR|Q|START|END|TENANT_ID|MERCHANT|PROVIDER
# ─────────────────────────────────────────────
STEPS=(
"1|2025|Q4|2025-10-01|2025-12-31|e5c5bedf-d6ae-4d8c-a9f0-ae0e1c93cb09|Bella Napoli|square"
"2|2025|Q4|2025-10-01|2025-12-31|214c219d-eadf-4936-b0dd-0c071a516ea6|The Copper Kettle|square"
"3|2025|Q4|2025-10-01|2025-12-31|e8454026-5159-4d86-9ea9-e2777b7627c8|Casa del Sol|square"
"4|2025|Q4|2025-10-01|2025-12-31|2a817809-8391-42ef-83a8-c7bb5ba6f634|The Green Plate|square"
"5|2025|Q4|2025-10-01|2025-12-31|467c1346-1a5c-4952-9061-0190dadc662a|Sakura Ramen|square"
"6|2025|Q4|2025-10-01|2025-12-31|0809e4c9-a04c-49d8-a968-92b2d2b5d57f|Blue Lantern Noodle House|clover"
"7|2025|Q4|2025-10-01|2025-12-31|95fa1566-ed11-4e00-b77e-d4fee76877c8|The Gilded Fork|clover"
"8|2025|Q4|2025-10-01|2025-12-31|6ef9aaa3-8d5b-423b-8ec2-d2f62f1219b8|Casa Fuego|clover"
"9|2025|Q4|2025-10-01|2025-12-31|374d33eb-b41a-4074-9dc3-34054c08ce6a|Maple Street Bistro|clover"
"10|2025|Q4|2025-10-01|2025-12-31|cc171713-b08c-456b-82f4-465f888cc4a3|The Harbor Grille|clover"
"11|2025|Q3|2025-07-01|2025-09-30|e5c5bedf-d6ae-4d8c-a9f0-ae0e1c93cb09|Bella Napoli|square"
"12|2025|Q3|2025-07-01|2025-09-30|214c219d-eadf-4936-b0dd-0c071a516ea6|The Copper Kettle|square"
"13|2025|Q3|2025-07-01|2025-09-30|e8454026-5159-4d86-9ea9-e2777b7627c8|Casa del Sol|square"
"14|2025|Q3|2025-07-01|2025-09-30|2a817809-8391-42ef-83a8-c7bb5ba6f634|The Green Plate|square"
"15|2025|Q3|2025-07-01|2025-09-30|467c1346-1a5c-4952-9061-0190dadc662a|Sakura Ramen|square"
"16|2025|Q3|2025-07-01|2025-09-30|0809e4c9-a04c-49d8-a968-92b2d2b5d57f|Blue Lantern Noodle House|clover"
"17|2025|Q3|2025-07-01|2025-09-30|95fa1566-ed11-4e00-b77e-d4fee76877c8|The Gilded Fork|clover"
"18|2025|Q3|2025-07-01|2025-09-30|6ef9aaa3-8d5b-423b-8ec2-d2f62f1219b8|Casa Fuego|clover"
"19|2025|Q3|2025-07-01|2025-09-30|374d33eb-b41a-4074-9dc3-34054c08ce6a|Maple Street Bistro|clover"
"20|2025|Q3|2025-07-01|2025-09-30|cc171713-b08c-456b-82f4-465f888cc4a3|The Harbor Grille|clover"
"21|2025|Q2|2025-04-01|2025-06-30|e5c5bedf-d6ae-4d8c-a9f0-ae0e1c93cb09|Bella Napoli|square"
"22|2025|Q2|2025-04-01|2025-06-30|214c219d-eadf-4936-b0dd-0c071a516ea6|The Copper Kettle|square"
"23|2025|Q2|2025-04-01|2025-06-30|e8454026-5159-4d86-9ea9-e2777b7627c8|Casa del Sol|square"
"24|2025|Q2|2025-04-01|2025-06-30|2a817809-8391-42ef-83a8-c7bb5ba6f634|The Green Plate|square"
"25|2025|Q2|2025-04-01|2025-06-30|467c1346-1a5c-4952-9061-0190dadc662a|Sakura Ramen|square"
"26|2025|Q2|2025-04-01|2025-06-30|0809e4c9-a04c-49d8-a968-92b2d2b5d57f|Blue Lantern Noodle House|clover"
"27|2025|Q2|2025-04-01|2025-06-30|95fa1566-ed11-4e00-b77e-d4fee76877c8|The Gilded Fork|clover"
"28|2025|Q2|2025-04-01|2025-06-30|6ef9aaa3-8d5b-423b-8ec2-d2f62f1219b8|Casa Fuego|clover"
"29|2025|Q2|2025-04-01|2025-06-30|374d33eb-b41a-4074-9dc3-34054c08ce6a|Maple Street Bistro|clover"
"30|2025|Q2|2025-04-01|2025-06-30|cc171713-b08c-456b-82f4-465f888cc4a3|The Harbor Grille|clover"
"31|2025|Q1|2025-01-01|2025-03-31|e5c5bedf-d6ae-4d8c-a9f0-ae0e1c93cb09|Bella Napoli|square"
"32|2025|Q1|2025-01-01|2025-03-31|214c219d-eadf-4936-b0dd-0c071a516ea6|The Copper Kettle|square"
"33|2025|Q1|2025-01-01|2025-03-31|e8454026-5159-4d86-9ea9-e2777b7627c8|Casa del Sol|square"
"34|2025|Q1|2025-01-01|2025-03-31|2a817809-8391-42ef-83a8-c7bb5ba6f634|The Green Plate|square"
"35|2025|Q1|2025-01-01|2025-03-31|467c1346-1a5c-4952-9061-0190dadc662a|Sakura Ramen|square"
"36|2025|Q1|2025-01-01|2025-03-31|0809e4c9-a04c-49d8-a968-92b2d2b5d57f|Blue Lantern Noodle House|clover"
"37|2025|Q1|2025-01-01|2025-03-31|95fa1566-ed11-4e00-b77e-d4fee76877c8|The Gilded Fork|clover"
"38|2025|Q1|2025-01-01|2025-03-31|6ef9aaa3-8d5b-423b-8ec2-d2f62f1219b8|Casa Fuego|clover"
"39|2025|Q1|2025-01-01|2025-03-31|374d33eb-b41a-4074-9dc3-34054c08ce6a|Maple Street Bistro|clover"
"40|2025|Q1|2025-01-01|2025-03-31|cc171713-b08c-456b-82f4-465f888cc4a3|The Harbor Grille|clover"
"41|2024|Q4|2024-10-01|2024-12-31|e5c5bedf-d6ae-4d8c-a9f0-ae0e1c93cb09|Bella Napoli|square"
"42|2024|Q4|2024-10-01|2024-12-31|214c219d-eadf-4936-b0dd-0c071a516ea6|The Copper Kettle|square"
"43|2024|Q4|2024-10-01|2024-12-31|e8454026-5159-4d86-9ea9-e2777b7627c8|Casa del Sol|square"
"44|2024|Q4|2024-10-01|2024-12-31|2a817809-8391-42ef-83a8-c7bb5ba6f634|The Green Plate|square"
"45|2024|Q4|2024-10-01|2024-12-31|467c1346-1a5c-4952-9061-0190dadc662a|Sakura Ramen|square"
"46|2024|Q4|2024-10-01|2024-12-31|0809e4c9-a04c-49d8-a968-92b2d2b5d57f|Blue Lantern Noodle House|clover"
"47|2024|Q4|2024-10-01|2024-12-31|95fa1566-ed11-4e00-b77e-d4fee76877c8|The Gilded Fork|clover"
"48|2024|Q4|2024-10-01|2024-12-31|6ef9aaa3-8d5b-423b-8ec2-d2f62f1219b8|Casa Fuego|clover"
"49|2024|Q4|2024-10-01|2024-12-31|374d33eb-b41a-4074-9dc3-34054c08ce6a|Maple Street Bistro|clover"
"50|2024|Q4|2024-10-01|2024-12-31|cc171713-b08c-456b-82f4-465f888cc4a3|The Harbor Grille|clover"
"51|2024|Q3|2024-07-01|2024-09-30|e5c5bedf-d6ae-4d8c-a9f0-ae0e1c93cb09|Bella Napoli|square"
"52|2024|Q3|2024-07-01|2024-09-30|214c219d-eadf-4936-b0dd-0c071a516ea6|The Copper Kettle|square"
"53|2024|Q3|2024-07-01|2024-09-30|e8454026-5159-4d86-9ea9-e2777b7627c8|Casa del Sol|square"
"54|2024|Q3|2024-07-01|2024-09-30|2a817809-8391-42ef-83a8-c7bb5ba6f634|The Green Plate|square"
"55|2024|Q3|2024-07-01|2024-09-30|467c1346-1a5c-4952-9061-0190dadc662a|Sakura Ramen|square"
"56|2024|Q3|2024-07-01|2024-09-30|0809e4c9-a04c-49d8-a968-92b2d2b5d57f|Blue Lantern Noodle House|clover"
"57|2024|Q3|2024-07-01|2024-09-30|95fa1566-ed11-4e00-b77e-d4fee76877c8|The Gilded Fork|clover"
"58|2024|Q3|2024-07-01|2024-09-30|6ef9aaa3-8d5b-423b-8ec2-d2f62f1219b8|Casa Fuego|clover"
"59|2024|Q3|2024-07-01|2024-09-30|374d33eb-b41a-4074-9dc3-34054c08ce6a|Maple Street Bistro|clover"
"60|2024|Q3|2024-07-01|2024-09-30|cc171713-b08c-456b-82f4-465f888cc4a3|The Harbor Grille|clover"
"61|2024|Q2|2024-04-01|2024-06-30|e5c5bedf-d6ae-4d8c-a9f0-ae0e1c93cb09|Bella Napoli|square"
"62|2024|Q2|2024-04-01|2024-06-30|214c219d-eadf-4936-b0dd-0c071a516ea6|The Copper Kettle|square"
"63|2024|Q2|2024-04-01|2024-06-30|e8454026-5159-4d86-9ea9-e2777b7627c8|Casa del Sol|square"
"64|2024|Q2|2024-04-01|2024-06-30|2a817809-8391-42ef-83a8-c7bb5ba6f634|The Green Plate|square"
"65|2024|Q2|2024-04-01|2024-06-30|467c1346-1a5c-4952-9061-0190dadc662a|Sakura Ramen|square"
"66|2024|Q2|2024-04-01|2024-06-30|0809e4c9-a04c-49d8-a968-92b2d2b5d57f|Blue Lantern Noodle House|clover"
"67|2024|Q2|2024-04-01|2024-06-30|95fa1566-ed11-4e00-b77e-d4fee76877c8|The Gilded Fork|clover"
"68|2024|Q2|2024-04-01|2024-06-30|6ef9aaa3-8d5b-423b-8ec2-d2f62f1219b8|Casa Fuego|clover"
"69|2024|Q2|2024-04-01|2024-06-30|374d33eb-b41a-4074-9dc3-34054c08ce6a|Maple Street Bistro|clover"
"70|2024|Q2|2024-04-01|2024-06-30|cc171713-b08c-456b-82f4-465f888cc4a3|The Harbor Grille|clover"
"71|2024|Q1|2024-01-01|2024-03-31|e5c5bedf-d6ae-4d8c-a9f0-ae0e1c93cb09|Bella Napoli|square"
"72|2024|Q1|2024-01-01|2024-03-31|214c219d-eadf-4936-b0dd-0c071a516ea6|The Copper Kettle|square"
"73|2024|Q1|2024-01-01|2024-03-31|e8454026-5159-4d86-9ea9-e2777b7627c8|Casa del Sol|square"
"74|2024|Q1|2024-01-01|2024-03-31|2a817809-8391-42ef-83a8-c7bb5ba6f634|The Green Plate|square"
"75|2024|Q1|2024-01-01|2024-03-31|467c1346-1a5c-4952-9061-0190dadc662a|Sakura Ramen|square"
"76|2024|Q1|2024-01-01|2024-03-31|0809e4c9-a04c-49d8-a968-92b2d2b5d57f|Blue Lantern Noodle House|clover"
"77|2024|Q1|2024-01-01|2024-03-31|95fa1566-ed11-4e00-b77e-d4fee76877c8|The Gilded Fork|clover"
"78|2024|Q1|2024-01-01|2024-03-31|6ef9aaa3-8d5b-423b-8ec2-d2f62f1219b8|Casa Fuego|clover"
"79|2024|Q1|2024-01-01|2024-03-31|374d33eb-b41a-4074-9dc3-34054c08ce6a|Maple Street Bistro|clover"
"80|2024|Q1|2024-01-01|2024-03-31|cc171713-b08c-456b-82f4-465f888cc4a3|The Harbor Grille|clover"
"81|2023|Q4|2023-10-01|2023-12-31|e5c5bedf-d6ae-4d8c-a9f0-ae0e1c93cb09|Bella Napoli|square"
"82|2023|Q4|2023-10-01|2023-12-31|214c219d-eadf-4936-b0dd-0c071a516ea6|The Copper Kettle|square"
"83|2023|Q4|2023-10-01|2023-12-31|e8454026-5159-4d86-9ea9-e2777b7627c8|Casa del Sol|square"
"84|2023|Q4|2023-10-01|2023-12-31|2a817809-8391-42ef-83a8-c7bb5ba6f634|The Green Plate|square"
"85|2023|Q4|2023-10-01|2023-12-31|467c1346-1a5c-4952-9061-0190dadc662a|Sakura Ramen|square"
"86|2023|Q4|2023-10-01|2023-12-31|0809e4c9-a04c-49d8-a968-92b2d2b5d57f|Blue Lantern Noodle House|clover"
"87|2023|Q4|2023-10-01|2023-12-31|95fa1566-ed11-4e00-b77e-d4fee76877c8|The Gilded Fork|clover"
"88|2023|Q4|2023-10-01|2023-12-31|6ef9aaa3-8d5b-423b-8ec2-d2f62f1219b8|Casa Fuego|clover"
"89|2023|Q4|2023-10-01|2023-12-31|374d33eb-b41a-4074-9dc3-34054c08ce6a|Maple Street Bistro|clover"
"90|2023|Q4|2023-10-01|2023-12-31|cc171713-b08c-456b-82f4-465f888cc4a3|The Harbor Grille|clover"
"91|2023|Q3|2023-07-01|2023-09-30|e5c5bedf-d6ae-4d8c-a9f0-ae0e1c93cb09|Bella Napoli|square"
"92|2023|Q3|2023-07-01|2023-09-30|214c219d-eadf-4936-b0dd-0c071a516ea6|The Copper Kettle|square"
"93|2023|Q3|2023-07-01|2023-09-30|e8454026-5159-4d86-9ea9-e2777b7627c8|Casa del Sol|square"
"94|2023|Q3|2023-07-01|2023-09-30|2a817809-8391-42ef-83a8-c7bb5ba6f634|The Green Plate|square"
"95|2023|Q3|2023-07-01|2023-09-30|467c1346-1a5c-4952-9061-0190dadc662a|Sakura Ramen|square"
"96|2023|Q3|2023-07-01|2023-09-30|0809e4c9-a04c-49d8-a968-92b2d2b5d57f|Blue Lantern Noodle House|clover"
"97|2023|Q3|2023-07-01|2023-09-30|95fa1566-ed11-4e00-b77e-d4fee76877c8|The Gilded Fork|clover"
"98|2023|Q3|2023-07-01|2023-09-30|6ef9aaa3-8d5b-423b-8ec2-d2f62f1219b8|Casa Fuego|clover"
"99|2023|Q3|2023-07-01|2023-09-30|374d33eb-b41a-4074-9dc3-34054c08ce6a|Maple Street Bistro|clover"
"100|2023|Q3|2023-07-01|2023-09-30|cc171713-b08c-456b-82f4-465f888cc4a3|The Harbor Grille|clover"
"101|2023|Q2|2023-04-01|2023-06-30|e5c5bedf-d6ae-4d8c-a9f0-ae0e1c93cb09|Bella Napoli|square"
"102|2023|Q2|2023-04-01|2023-06-30|214c219d-eadf-4936-b0dd-0c071a516ea6|The Copper Kettle|square"
"103|2023|Q2|2023-04-01|2023-06-30|e8454026-5159-4d86-9ea9-e2777b7627c8|Casa del Sol|square"
"104|2023|Q2|2023-04-01|2023-06-30|2a817809-8391-42ef-83a8-c7bb5ba6f634|The Green Plate|square"
"105|2023|Q2|2023-04-01|2023-06-30|467c1346-1a5c-4952-9061-0190dadc662a|Sakura Ramen|square"
"106|2023|Q2|2023-04-01|2023-06-30|0809e4c9-a04c-49d8-a968-92b2d2b5d57f|Blue Lantern Noodle House|clover"
"107|2023|Q2|2023-04-01|2023-06-30|95fa1566-ed11-4e00-b77e-d4fee76877c8|The Gilded Fork|clover"
"108|2023|Q2|2023-04-01|2023-06-30|6ef9aaa3-8d5b-423b-8ec2-d2f62f1219b8|Casa Fuego|clover"
"109|2023|Q2|2023-04-01|2023-06-30|374d33eb-b41a-4074-9dc3-34054c08ce6a|Maple Street Bistro|clover"
"110|2023|Q2|2023-04-01|2023-06-30|cc171713-b08c-456b-82f4-465f888cc4a3|The Harbor Grille|clover"
"111|2023|Q1|2023-01-01|2023-03-31|e5c5bedf-d6ae-4d8c-a9f0-ae0e1c93cb09|Bella Napoli|square"
"112|2023|Q1|2023-01-01|2023-03-31|214c219d-eadf-4936-b0dd-0c071a516ea6|The Copper Kettle|square"
"113|2023|Q1|2023-01-01|2023-03-31|e8454026-5159-4d86-9ea9-e2777b7627c8|Casa del Sol|square"
"114|2023|Q1|2023-01-01|2023-03-31|2a817809-8391-42ef-83a8-c7bb5ba6f634|The Green Plate|square"
"115|2023|Q1|2023-01-01|2023-03-31|467c1346-1a5c-4952-9061-0190dadc662a|Sakura Ramen|square"
"116|2023|Q1|2023-01-01|2023-03-31|0809e4c9-a04c-49d8-a968-92b2d2b5d57f|Blue Lantern Noodle House|clover"
"117|2023|Q1|2023-01-01|2023-03-31|95fa1566-ed11-4e00-b77e-d4fee76877c8|The Gilded Fork|clover"
"118|2023|Q1|2023-01-01|2023-03-31|6ef9aaa3-8d5b-423b-8ec2-d2f62f1219b8|Casa Fuego|clover"
"119|2023|Q1|2023-01-01|2023-03-31|374d33eb-b41a-4074-9dc3-34054c08ce6a|Maple Street Bistro|clover"
"120|2023|Q1|2023-01-01|2023-03-31|cc171713-b08c-456b-82f4-465f888cc4a3|The Harbor Grille|clover"
"121|2022|Q4|2022-10-01|2022-12-31|e5c5bedf-d6ae-4d8c-a9f0-ae0e1c93cb09|Bella Napoli|square"
"122|2022|Q4|2022-10-01|2022-12-31|214c219d-eadf-4936-b0dd-0c071a516ea6|The Copper Kettle|square"
"123|2022|Q4|2022-10-01|2022-12-31|e8454026-5159-4d86-9ea9-e2777b7627c8|Casa del Sol|square"
"124|2022|Q4|2022-10-01|2022-12-31|2a817809-8391-42ef-83a8-c7bb5ba6f634|The Green Plate|square"
"125|2022|Q4|2022-10-01|2022-12-31|467c1346-1a5c-4952-9061-0190dadc662a|Sakura Ramen|square"
"126|2022|Q4|2022-10-01|2022-12-31|0809e4c9-a04c-49d8-a968-92b2d2b5d57f|Blue Lantern Noodle House|clover"
"127|2022|Q4|2022-10-01|2022-12-31|95fa1566-ed11-4e00-b77e-d4fee76877c8|The Gilded Fork|clover"
"128|2022|Q4|2022-10-01|2022-12-31|6ef9aaa3-8d5b-423b-8ec2-d2f62f1219b8|Casa Fuego|clover"
"129|2022|Q4|2022-10-01|2022-12-31|374d33eb-b41a-4074-9dc3-34054c08ce6a|Maple Street Bistro|clover"
"130|2022|Q4|2022-10-01|2022-12-31|cc171713-b08c-456b-82f4-465f888cc4a3|The Harbor Grille|clover"
"131|2022|Q3|2022-07-01|2022-09-30|e5c5bedf-d6ae-4d8c-a9f0-ae0e1c93cb09|Bella Napoli|square"
"132|2022|Q3|2022-07-01|2022-09-30|214c219d-eadf-4936-b0dd-0c071a516ea6|The Copper Kettle|square"
"133|2022|Q3|2022-07-01|2022-09-30|e8454026-5159-4d86-9ea9-e2777b7627c8|Casa del Sol|square"
"134|2022|Q3|2022-07-01|2022-09-30|2a817809-8391-42ef-83a8-c7bb5ba6f634|The Green Plate|square"
"135|2022|Q3|2022-07-01|2022-09-30|467c1346-1a5c-4952-9061-0190dadc662a|Sakura Ramen|square"
"136|2022|Q3|2022-07-01|2022-09-30|0809e4c9-a04c-49d8-a968-92b2d2b5d57f|Blue Lantern Noodle House|clover"
"137|2022|Q3|2022-07-01|2022-09-30|95fa1566-ed11-4e00-b77e-d4fee76877c8|The Gilded Fork|clover"
"138|2022|Q3|2022-07-01|2022-09-30|6ef9aaa3-8d5b-423b-8ec2-d2f62f1219b8|Casa Fuego|clover"
"139|2022|Q3|2022-07-01|2022-09-30|374d33eb-b41a-4074-9dc3-34054c08ce6a|Maple Street Bistro|clover"
"140|2022|Q3|2022-07-01|2022-09-30|cc171713-b08c-456b-82f4-465f888cc4a3|The Harbor Grille|clover"
"141|2022|Q2|2022-04-01|2022-06-30|e5c5bedf-d6ae-4d8c-a9f0-ae0e1c93cb09|Bella Napoli|square"
"142|2022|Q2|2022-04-01|2022-06-30|214c219d-eadf-4936-b0dd-0c071a516ea6|The Copper Kettle|square"
"143|2022|Q2|2022-04-01|2022-06-30|e8454026-5159-4d86-9ea9-e2777b7627c8|Casa del Sol|square"
"144|2022|Q2|2022-04-01|2022-06-30|2a817809-8391-42ef-83a8-c7bb5ba6f634|The Green Plate|square"
"145|2022|Q2|2022-04-01|2022-06-30|467c1346-1a5c-4952-9061-0190dadc662a|Sakura Ramen|square"
"146|2022|Q2|2022-04-01|2022-06-30|0809e4c9-a04c-49d8-a968-92b2d2b5d57f|Blue Lantern Noodle House|clover"
"147|2022|Q2|2022-04-01|2022-06-30|95fa1566-ed11-4e00-b77e-d4fee76877c8|The Gilded Fork|clover"
"148|2022|Q2|2022-04-01|2022-06-30|6ef9aaa3-8d5b-423b-8ec2-d2f62f1219b8|Casa Fuego|clover"
"149|2022|Q2|2022-04-01|2022-06-30|374d33eb-b41a-4074-9dc3-34054c08ce6a|Maple Street Bistro|clover"
"150|2022|Q2|2022-04-01|2022-06-30|cc171713-b08c-456b-82f4-465f888cc4a3|The Harbor Grille|clover"
"151|2022|Q1|2022-01-01|2022-03-31|e5c5bedf-d6ae-4d8c-a9f0-ae0e1c93cb09|Bella Napoli|square"
"152|2022|Q1|2022-01-01|2022-03-31|214c219d-eadf-4936-b0dd-0c071a516ea6|The Copper Kettle|square"
"153|2022|Q1|2022-01-01|2022-03-31|e8454026-5159-4d86-9ea9-e2777b7627c8|Casa del Sol|square"
"154|2022|Q1|2022-01-01|2022-03-31|2a817809-8391-42ef-83a8-c7bb5ba6f634|The Green Plate|square"
"155|2022|Q1|2022-01-01|2022-03-31|467c1346-1a5c-4952-9061-0190dadc662a|Sakura Ramen|square"
"156|2022|Q1|2022-01-01|2022-03-31|0809e4c9-a04c-49d8-a968-92b2d2b5d57f|Blue Lantern Noodle House|clover"
"157|2022|Q1|2022-01-01|2022-03-31|95fa1566-ed11-4e00-b77e-d4fee76877c8|The Gilded Fork|clover"
"158|2022|Q1|2022-01-01|2022-03-31|6ef9aaa3-8d5b-423b-8ec2-d2f62f1219b8|Casa Fuego|clover"
"159|2022|Q1|2022-01-01|2022-03-31|374d33eb-b41a-4074-9dc3-34054c08ce6a|Maple Street Bistro|clover"
"160|2022|Q1|2022-01-01|2022-03-31|cc171713-b08c-456b-82f4-465f888cc4a3|The Harbor Grille|clover"
"161|2021|Q4|2021-10-01|2021-12-31|e5c5bedf-d6ae-4d8c-a9f0-ae0e1c93cb09|Bella Napoli|square"
"162|2021|Q4|2021-10-01|2021-12-31|214c219d-eadf-4936-b0dd-0c071a516ea6|The Copper Kettle|square"
"163|2021|Q4|2021-10-01|2021-12-31|e8454026-5159-4d86-9ea9-e2777b7627c8|Casa del Sol|square"
"164|2021|Q4|2021-10-01|2021-12-31|2a817809-8391-42ef-83a8-c7bb5ba6f634|The Green Plate|square"
"165|2021|Q4|2021-10-01|2021-12-31|467c1346-1a5c-4952-9061-0190dadc662a|Sakura Ramen|square"
"166|2021|Q4|2021-10-01|2021-12-31|0809e4c9-a04c-49d8-a968-92b2d2b5d57f|Blue Lantern Noodle House|clover"
"167|2021|Q4|2021-10-01|2021-12-31|95fa1566-ed11-4e00-b77e-d4fee76877c8|The Gilded Fork|clover"
"168|2021|Q4|2021-10-01|2021-12-31|6ef9aaa3-8d5b-423b-8ec2-d2f62f1219b8|Casa Fuego|clover"
"169|2021|Q4|2021-10-01|2021-12-31|374d33eb-b41a-4074-9dc3-34054c08ce6a|Maple Street Bistro|clover"
"170|2021|Q4|2021-10-01|2021-12-31|cc171713-b08c-456b-82f4-465f888cc4a3|The Harbor Grille|clover"
"171|2021|Q3|2021-07-01|2021-09-30|e5c5bedf-d6ae-4d8c-a9f0-ae0e1c93cb09|Bella Napoli|square"
"172|2021|Q3|2021-07-01|2021-09-30|214c219d-eadf-4936-b0dd-0c071a516ea6|The Copper Kettle|square"
"173|2021|Q3|2021-07-01|2021-09-30|e8454026-5159-4d86-9ea9-e2777b7627c8|Casa del Sol|square"
"174|2021|Q3|2021-07-01|2021-09-30|2a817809-8391-42ef-83a8-c7bb5ba6f634|The Green Plate|square"
"175|2021|Q3|2021-07-01|2021-09-30|467c1346-1a5c-4952-9061-0190dadc662a|Sakura Ramen|square"
"176|2021|Q3|2021-07-01|2021-09-30|0809e4c9-a04c-49d8-a968-92b2d2b5d57f|Blue Lantern Noodle House|clover"
"177|2021|Q3|2021-07-01|2021-09-30|95fa1566-ed11-4e00-b77e-d4fee76877c8|The Gilded Fork|clover"
"178|2021|Q3|2021-07-01|2021-09-30|6ef9aaa3-8d5b-423b-8ec2-d2f62f1219b8|Casa Fuego|clover"
"179|2021|Q3|2021-07-01|2021-09-30|374d33eb-b41a-4074-9dc3-34054c08ce6a|Maple Street Bistro|clover"
"180|2021|Q3|2021-07-01|2021-09-30|cc171713-b08c-456b-82f4-465f888cc4a3|The Harbor Grille|clover"
"181|2021|Q2|2021-04-01|2021-06-30|e5c5bedf-d6ae-4d8c-a9f0-ae0e1c93cb09|Bella Napoli|square"
"182|2021|Q2|2021-04-01|2021-06-30|214c219d-eadf-4936-b0dd-0c071a516ea6|The Copper Kettle|square"
"183|2021|Q2|2021-04-01|2021-06-30|e8454026-5159-4d86-9ea9-e2777b7627c8|Casa del Sol|square"
"184|2021|Q2|2021-04-01|2021-06-30|2a817809-8391-42ef-83a8-c7bb5ba6f634|The Green Plate|square"
"185|2021|Q2|2021-04-01|2021-06-30|467c1346-1a5c-4952-9061-0190dadc662a|Sakura Ramen|square"
"186|2021|Q2|2021-04-01|2021-06-30|0809e4c9-a04c-49d8-a968-92b2d2b5d57f|Blue Lantern Noodle House|clover"
"187|2021|Q2|2021-04-01|2021-06-30|95fa1566-ed11-4e00-b77e-d4fee76877c8|The Gilded Fork|clover"
"188|2021|Q2|2021-04-01|2021-06-30|6ef9aaa3-8d5b-423b-8ec2-d2f62f1219b8|Casa Fuego|clover"
"189|2021|Q2|2021-04-01|2021-06-30|374d33eb-b41a-4074-9dc3-34054c08ce6a|Maple Street Bistro|clover"
"190|2021|Q2|2021-04-01|2021-06-30|cc171713-b08c-456b-82f4-465f888cc4a3|The Harbor Grille|clover"
"191|2021|Q1|2021-01-01|2021-03-31|e5c5bedf-d6ae-4d8c-a9f0-ae0e1c93cb09|Bella Napoli|square"
"192|2021|Q1|2021-01-01|2021-03-31|214c219d-eadf-4936-b0dd-0c071a516ea6|The Copper Kettle|square"
"193|2021|Q1|2021-01-01|2021-03-31|e8454026-5159-4d86-9ea9-e2777b7627c8|Casa del Sol|square"
"194|2021|Q1|2021-01-01|2021-03-31|2a817809-8391-42ef-83a8-c7bb5ba6f634|The Green Plate|square"
"195|2021|Q1|2021-01-01|2021-03-31|467c1346-1a5c-4952-9061-0190dadc662a|Sakura Ramen|square"
"196|2021|Q1|2021-01-01|2021-03-31|0809e4c9-a04c-49d8-a968-92b2d2b5d57f|Blue Lantern Noodle House|clover"
"197|2021|Q1|2021-01-01|2021-03-31|95fa1566-ed11-4e00-b77e-d4fee76877c8|The Gilded Fork|clover"
"198|2021|Q1|2021-01-01|2021-03-31|6ef9aaa3-8d5b-423b-8ec2-d2f62f1219b8|Casa Fuego|clover"
"199|2021|Q1|2021-01-01|2021-03-31|374d33eb-b41a-4074-9dc3-34054c08ce6a|Maple Street Bistro|clover"
"200|2021|Q1|2021-01-01|2021-03-31|cc171713-b08c-456b-82f4-465f888cc4a3|The Harbor Grille|clover"
)

# ─────────────────────────────────────────────
# RUN STEPS
# ─────────────────────────────────────────────

TOTAL=${#STEPS[@]}
COMPLETED=0
FAILED=0

for STEP_DATA in "${STEPS[@]}"; do
    IFS='|' read -r STEP YEAR Q START END TENANT MERCHANT PROVIDER <<< "$STEP_DATA"

    # Skip steps before FROM_STEP
    if [ "$STEP" -lt "$FROM_STEP" ]; then
        continue
    fi

    # Filter by year if specified
    if [ -n "$YEAR_FILTER" ] && [ "$YEAR" != "$YEAR_FILTER" ]; then
        continue
    fi

    echo ""
    echo "────────────────────────────────────────────────────"
    echo "▶ Step $STEP/200 | $YEAR $Q | $MERCHANT ($PROVIDER)"
    echo "  Range: $START → $END"
    echo "  Tenant: $TENANT"
    echo "  Started: $(date)"
    echo "────────────────────────────────────────────────────"

    # Save progress
    echo "LAST_COMPLETED_STEP=$((STEP-1))" > "$PROGRESS_FILE"
    echo "CURRENT_STEP=$STEP" >> "$PROGRESS_FILE"
    echo "CURRENT_MERCHANT=$MERCHANT" >> "$PROGRESS_FILE"

    # Run the script
    if $SCRIPT \
        --start "$START" \
        --end "$END" \
        --tenant-id "$TENANT" \
        --batch-size "$BATCH_SIZE" \
        2>&1 | tee -a "$LOG_FILE"; then

        echo "✅ Step $STEP DONE — $MERCHANT $YEAR $Q" | tee -a "$LOG_FILE"
        echo "LAST_COMPLETED_STEP=$STEP" > "$PROGRESS_FILE"
        COMPLETED=$((COMPLETED + 1))
    else
        echo "❌ Step $STEP FAILED — $MERCHANT $YEAR $Q" | tee -a "$LOG_FILE"
        FAILED=$((FAILED + 1))
        echo "Retrying in 30 seconds..."
        sleep 30

        # Retry once
        if $SCRIPT \
            --start "$START" \
            --end "$END" \
            --tenant-id "$TENANT" \
            --batch-size "$BATCH_SIZE" \
            2>&1 | tee -a "$LOG_FILE"; then
            echo "✅ Step $STEP RETRY SUCCEEDED" | tee -a "$LOG_FILE"
            COMPLETED=$((COMPLETED + 1))
            FAILED=$((FAILED - 1))
        else
            echo "❌ Step $STEP RETRY FAILED — skipping" | tee -a "$LOG_FILE"
        fi
    fi

    # Small pause between steps
    sleep 5
done

echo ""
echo "============================================================"
echo "ALL STEPS COMPLETE"
echo "  Completed: $COMPLETED"
echo "  Failed:    $FAILED"
echo "  Finished:  $(date)"
echo "============================================================"
