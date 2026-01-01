#!/bin/bash
# Start backend
cd "$(dirname "$0")/server" && npm install && npm run dev &
BACK_PID=$!

# Start frontend
cd "$(dirname "$0")" && npm install && npm start &
FRONT_PID=$!

# Wait for both to exit
wait $BACK_PID $FRONT_PID
