FROM pandoc/core:latest

# Add Python and create a venv so pip doesn't fight the system packages.
RUN apk add --no-cache python3 py3-pip \
 && python3 -m venv /venv \
 && /venv/bin/pip install --no-cache-dir flask

ENV PATH="/venv/bin:$PATH"

WORKDIR /app
COPY frontend/ .
COPY pandoc/ pandoc/

EXPOSE 8080

ENTRYPOINT []
CMD ["python3", "app.py"]
