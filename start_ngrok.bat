@echo off
echo ====================================================
echo Starting ngrok tunnel for FastAPI backend (Port 8000)
echo Public URL: https://these-zestfully-haziness.ngrok-free.dev
echo ====================================================
ngrok http --url https://these-zestfully-haziness.ngrok-free.dev 8000
pause
