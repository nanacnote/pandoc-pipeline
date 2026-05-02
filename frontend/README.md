# Frontend (Pandoc Converter)

A small Flask + static UI app for converting text/files with Pandoc.

## What You Can Do

- Paste Markdown (or other input formats) and convert instantly
- Upload files and convert them using Pandoc formats
- Use project defaults files from `pandoc/defaults/*.yaml`
- Pass extra Pandoc flags (for example `--toc`, `--number-sections`)
- Download binary outputs directly (PDF, DOCX, EPUB, etc.)
- Keep HTML output as-is (including embedded `data:image` sources)
- Extract embedded HTML images as standalone files via **Download Images**

## Run

From project root:

```bash
docker compose up -d --build
```

Open:

- http://localhost:8080

## API

### GET /api/formats

Returns supported Pandoc input and output formats.

### GET /api/defaults

Returns available defaults YAML files and inferred output extension.

### POST /api/convert

Accepts `multipart/form-data`.

Fields:

- `from` and `to` (required when `defaults` is not used)
- `defaults` (optional path to a defaults YAML)
- `extra_flags` (optional string, shell-like parsed)
- `content` (paste mode text) or `file` (upload mode)

Behavior:

- Text outputs return JSON: `{ "output": "..." }`
- Binary outputs stream as file download with `Content-Disposition`

## Quick cURL

Text conversion:

```bash
curl -s -X POST http://localhost:8080/api/convert \
  -F from=markdown \
  -F to=html5 \
  -F content='# Hello' | jq -r .output
```

PDF download:

```bash
curl -s -X POST http://localhost:8080/api/convert \
  -F defaults=/app/pandoc/defaults/pdf.yaml \
  -F file=@tests/input.md \
  -o output.pdf
```
