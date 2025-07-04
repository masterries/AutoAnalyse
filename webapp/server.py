#!/usr/bin/env python3
"""
Einfacher lokaler Server für AutoAnalyse Frontend
"""

import http.server
import socketserver
import os
from pathlib import Path

# Zum webapp Verzeichnis wechseln
os.chdir(Path(__file__).parent)

PORT = 8080

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # CORS Headers hinzufügen für lokale Entwicklung
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_GET(self):
        # Für SQLite-Dateien den richtigen MIME-Type setzen
        if self.path.endswith('.db'):
            self.send_response(200)
            self.send_header('Content-type', 'application/octet-stream')
            self.end_headers()
            
            # Relativen Pfad zur Datenbank
            db_path = Path('../scrapper/data/autoscout_data.db')
            if db_path.exists():
                with open(db_path, 'rb') as f:
                    self.wfile.write(f.read())
            else:
                self.send_error(404, 'Datenbank nicht gefunden')
            return
        
        super().do_GET()

if __name__ == "__main__":
    with socketserver.TCPServer(("0.0.0.0", PORT), MyHTTPRequestHandler) as httpd:
        print(f"Server läuft auf http://0.0.0.0:{PORT}")
        print("In GitHub Codespace: Der Port wird automatisch weitergeleitet")
        print("Drücken Sie Ctrl+C zum Beenden")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer beendet")
