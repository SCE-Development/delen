import http.server
import socketserver
import json

PORT = 6000

class MyHandler(http.server.SimpleHTTPRequestHandler):
    
    def do_GET(self):
        # - request -
    
        self.send_response(200)
        self.send_header('Content-type', 'text/json')
        self.end_headers()
        
        output_data = {'status': 'OK', 'result': 'HELLO WORLD!'}
        output_json = json.dumps(output_data)
        
        self.wfile.write(output_json.encode('utf-8'))


Handler = MyHandler

try:
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Starting http://0.0.0.0:{PORT}")
        httpd.serve_forever()
except KeyboardInterrupt:
    print("Stopping by Ctrl+C")
    httpd.server_close()  # to resolve problem `OSError: [Errno 98] Address alre