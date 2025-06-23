#!/usr/bin/env python3
"""
Simple HTTP server for testing the Markdown Data Extension Parser
Usage: python serve.py [port]
Default port: 8000
"""

import sys
import os
import http.server
import socketserver
import webbrowser
from pathlib import Path

def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    
    # Change to the script's directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    Handler = http.server.SimpleHTTPRequestHandler
    
    # Add CORS headers for local development
    class CORSRequestHandler(Handler):
        def end_headers(self):
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', '*')
            super().end_headers()
    
    with socketserver.TCPServer(("", port), CORSRequestHandler) as httpd:
        print(f"Serving at http://localhost:{port}/")
        print(f"Open test page: http://localhost:{port}/test.html")
        
        # Auto-open browser
        try:
            webbrowser.open(f'http://localhost:{port}/test.html')
        except:
            pass
            
        print("Press Ctrl+C to stop the server")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == "__main__":
    main()