#!/bin/bash
# Valora AI — Full Dev Stack Launcher

echo "🚀 Starting Valora AI Dev Stack..."

# Kill any existing processes
pkill -f "celery" 2>/dev/null
pkill -f "ngrok" 2>/dev/null
sleep 1

cd ~/valorarestaurant/backend
set -a && source .env.local && set +a

# 1. Redis (if not running)
echo "📦 Checking Redis..."
redis-cli ping 2>/dev/null || redis-server --daemonize yes
sleep 1

# 2. FastAPI Backend
echo "🔧 Starting FastAPI..."
uvicorn main:app --reload --port 8000 &
FASTAPI_PID=$!
sleep 2

# 3. Celery Worker
echo "⚙️ Starting Celery Worker..."
celery -A app.worker.celery_app worker \
  --loglevel=info \
  -Q sync,default \
  --concurrency=2 &
CELERY_PID=$!
sleep 2

# 4. Celery Beat
echo "🕐 Starting Celery Beat..."
celery -A app.worker.celery_app beat \
  --loglevel=info &
BEAT_PID=$!
sleep 1

# 5. ngrok
echo "🌐 Starting ngrok..."
ngrok http 8000 --log=stdout > /tmp/ngrok.log &
NGROK_PID=$!
sleep 2

# 6. Frontend
echo "🎨 Starting Next.js..."
cd ~/valorarestaurant/frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ All services started!"
echo "  FastAPI:  http://localhost:8000/docs"
echo "  Frontend: http://localhost:3000"
echo "  ngrok:    $(cat /tmp/ngrok.log | grep 'url=' | head -1)"
echo ""
echo "PIDs: FastAPI=$FASTAPI_PID Celery=$CELERY_PID Beat=$BEAT_PID ngrok=$NGROK_PID Frontend=$FRONTEND_PID"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait and cleanup
trap "kill $FASTAPI_PID $CELERY_PID $BEAT_PID $NGROK_PID $FRONTEND_PID 2>/dev/null; echo 'All services stopped'" EXIT
wait
