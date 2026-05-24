#!/bin/bash
echo "=========================================="
echo "  CROWNFALL TACTICS - LAUNCHER"
echo "=========================================="
echo ""
echo "Starting local server on port 10000..."
echo ""

# Kill existing servers
pkill -f "http.server 10000" 2>/dev/null

# Start server
cd "/mnt/agents/output/crownfall-tactics"
python3 -m http.server 10000 &
SERVER_PID=$!

echo "Server started (PID: $SERVER_PID)"
echo ""
echo "Opening game in browser..."
echo ""

sleep 2

# Open browser
if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:10000"
elif command -v open &> /dev/null; then
    open "http://localhost:10000"
else
    echo "Please open: http://localhost:10000"
fi

echo ""
echo "Press Enter to stop the server and exit..."
read

kill $SERVER_PID 2>/dev/null
echo "Server stopped. Goodbye!"
