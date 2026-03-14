from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


ROUTES = {
    "/api/": "http://127.0.0.1:8000",
    "/app/": "http://127.0.0.1:4173",
    "/": "http://127.0.0.1:3000",
}

HOP_BY_HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "content-length",
}


def resolve_target(path: str) -> str:
    if path.startswith("/api/"):
        return ROUTES["/api/"]
    if path.startswith("/app/"):
        return ROUTES["/app/"]
    return ROUTES["/"]


class ProxyHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.0"

    def do_GET(self):
        self._proxy()

    def do_HEAD(self):
        self._proxy(send_body=False)

    def do_POST(self):
        self._proxy()

    def do_PUT(self):
        self._proxy()

    def do_PATCH(self):
        self._proxy()

    def do_DELETE(self):
        self._proxy()

    def do_OPTIONS(self):
        self._proxy()

    def _proxy(self, send_body: bool = True):
        upstream = resolve_target(self.path)
        target_url = f"{upstream}{self.path}"
        content_length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(content_length) if content_length > 0 else None

        request_headers = {}
        for key, value in self.headers.items():
            normalized = key.lower()
            if normalized in HOP_BY_HOP_HEADERS or normalized == "host":
                continue
            request_headers[key] = value

        request_headers["Host"] = urlsplit(upstream).netloc
        request_headers["X-Forwarded-Proto"] = "http"
        request_headers["X-Forwarded-Host"] = self.headers.get("Host", "127.0.0.1:8080")
        request_headers["Accept-Encoding"] = "identity"

        upstream_method = "GET" if self.command == "HEAD" else self.command
        request = Request(target_url, data=body, headers=request_headers, method=upstream_method)

        try:
            with urlopen(request, timeout=60) as response:
                payload = response.read()
                self.send_response(response.status)
                for key, value in response.getheaders():
                    if key.lower() in HOP_BY_HOP_HEADERS:
                        continue
                    self.send_header(key, value)
                self.send_header("Content-Length", str(len(payload)))
                self.send_header("Connection", "close")
                self.end_headers()
                if send_body:
                    self.wfile.write(payload)
        except HTTPError as exc:
            payload = exc.read()
            self.send_response(exc.code)
            for key, value in exc.headers.items():
                if key.lower() in HOP_BY_HOP_HEADERS:
                    continue
                self.send_header(key, value)
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Connection", "close")
            self.end_headers()
            if send_body:
                self.wfile.write(payload)
        except URLError as exc:
            message = f"Upstream unavailable: {exc.reason}\n".encode("utf-8")
            self.send_response(502)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(message)))
            self.send_header("Connection", "close")
            self.end_headers()
            if send_body:
                self.wfile.write(message)

    def log_message(self, format, *args):
        return


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 8080), ProxyHandler)
    print("Local gateway running on http://127.0.0.1:8080")
    server.serve_forever()
