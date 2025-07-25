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

def find_free_port(start_port=8000, max_attempts=10):
    """Find the next available port starting from start_port"""
    for port in range(start_port, start_port + max_attempts):
        try:
            with socketserver.TCPServer(("", port), None):
                return port
        except OSError:
            continue
    return None

def main():
    requested_port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    
    # Find an available port
    port = find_free_port(requested_port)
    if port is None:
        print(f"Error: Could not find an available port starting from {requested_port}")
        sys.exit(1)
    
    if port != requested_port:
        print(f"Port {requested_port} is in use, using port {port} instead")
    
    # Change to the project root directory (parent of test folder)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    os.chdir(project_root)
    
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
        print(f"Open test page: http://localhost:{port}/test/test.html")
        
        # Auto-open browser
        try:
            webbrowser.open(f'http://localhost:{port}/test/test.html')
        except:
            pass
            
        print("Press Ctrl+C to stop the server")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == "__main__":
    main()