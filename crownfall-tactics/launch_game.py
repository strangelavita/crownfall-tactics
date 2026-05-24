#!/usr/bin/env python3
"""Crownfall Tactics - Game Launcher"""

import os
import sys
import subprocess
import time
import webbrowser
import socket

GAME_DIR = r"/mnt/agents/output/crownfall-tactics"
PORT = 10000

def is_port_free(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) != 0

def find_free_port(start=PORT):
    for p in range(start, start + 1000):
        if is_port_free(p):
            return p
    return None

def main():
    print("=" * 50)
    print("  CROWNFALL TACTICS - GAME LAUNCHER")
    print("=" * 50)
    print()

    # Check if port is free, find alternative if not
    port = PORT
    if not is_port_free(port):
        print(f"Port {port} is in use, finding alternative...")
        port = find_free_port(PORT + 1)
        if not port:
            print("ERROR: No free ports found!")
            input("Press Enter to exit...")
            return
        print(f"Using alternative port: {port}")

    print(f"Starting server on port {port}...")
    print(f"Game directory: {GAME_DIR}")
    print()

    # Start server
    proc = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(port)],
        cwd=GAME_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    time.sleep(2)

    # Verify server is running
    try:
        import urllib.request
        response = urllib.request.urlopen(f"http://localhost:{port}/", timeout=3)
        if response.status == 200:
            print("✓ Server is running!")
            print()
            print(f"Opening game in browser...")
            print(f"URL: http://localhost:{port}")
            print()
            webbrowser.open(f"http://localhost:{port}")
        else:
            print("✗ Server responded with error")
            proc.terminate()
            return
    except Exception as e:
        print(f"✗ Could not connect to server: {e}")
        proc.terminate()
        return

    print("=" * 50)
    print("Game is running! Close this window to stop the server.")
    print("=" * 50)
    print()

    try:
        input("Press Enter to stop the server and exit...")
    except KeyboardInterrupt:
        pass
    finally:
        print("Stopping server...")
        proc.terminate()
        proc.wait(timeout=2)
        print("Goodbye!")

if __name__ == "__main__":
    main()
