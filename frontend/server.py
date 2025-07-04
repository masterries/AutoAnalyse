#!/usr/bin/env python3
"""
Simple CORS-enabled HTTP server for local development
Serves the frontend with proper CORS headers to avoid GitHub Raw issues
"""

import http.server
import socketserver
import urllib.request
import os
from pathlib import Path

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()

    def do_GET(self):
        # If requesting the database file and it doesn't exist locally,
        # try to download it from GitHub
        if self.path == '/autoscout_data.db':
            db_path = Path('./autoscout_data.db')
            if not db_path.exists():
                try:
                    print("Downloading database from GitHub...")
                    url = 'https://github.com/masterries/AutoAnalyse/raw/refs/heads/main/scrapper/data/autoscout_data.db'
                    urllib.request.urlretrieve(url, db_path)
                    print("Database downloaded successfully!")
                except Exception as e:
                    print(f"Failed to download database: {e}")
        
        super().do_GET()

if __name__ == "__main__":
    PORT = 8080
    
    # Change to frontend directory
    frontend_dir = Path(__file__).parent
    os.chdir(frontend_dir)
    
    with socketserver.TCPServer(("", PORT), CORSHTTPRequestHandler) as httpd:
        print(f"🌐 CORS-enabled server running at http://localhost:{PORT}")
        print("📊 Frontend with AutoScout24 Dashboard")
        print("🗄️  Database will be loaded automatically")
        print("\n📱 Open in browser: http://localhost:8080")
        print("⏹️  Press Ctrl+C to stop\n")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n👋 Server stopped")
            httpd.shutdown()
