from app import app


class StripAPIPrefix:
    def __init__(self, application):
        self.application = application

    def __call__(self, environ, start_response):
        path = environ.get("PATH_INFO", "")

        if path == "/api":
            environ["PATH_INFO"] = "/"

        elif path.startswith("/api/"):
            environ["PATH_INFO"] = path[4:]

        return self.application(environ, start_response)


app = StripAPIPrefix(app)