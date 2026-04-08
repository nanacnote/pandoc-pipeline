import io
import os
import shlex
import subprocess
import tempfile
from pathlib import Path

from flask import Flask, jsonify, request, send_file

app = Flask(__name__, static_folder="static", static_url_path="")

PANDOC = os.environ.get("PANDOC_BIN", "pandoc")
TIMEOUT = int(os.environ.get("PANDOC_TIMEOUT", "30"))
# Directory containing project defaults files and filters.
# In Docker the working directory is /app and pandoc/ is copied there.
PANDOC_DIR = Path(os.environ.get("PANDOC_DIR", Path(__file__).parent / "pandoc" / "defaults"))

# Formats that pandoc writes as binary files — returned as downloads.
BINARY_FORMATS = frozenset(
    {"pdf", "docx", "odt", "pptx", "epub", "epub2", "epub3", "rtf"}
)

MIME_TYPES = {
    "pdf":   "application/pdf",
    "docx":  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "odt":   "application/vnd.oasis.opendocument.text",
    "pptx":  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "epub":  "application/epub+zip",
    "epub2": "application/epub+zip",
    "epub3": "application/epub+zip",
    "rtf":   "application/rtf",
}


def _pandoc_query(*args):
    return subprocess.run(
        [PANDOC, *args],
        capture_output=True,
        text=True,
        timeout=10,
    )


# Query pandoc once at startup so /api/formats is just a dict lookup.
try:
    _INPUT_FORMATS = _pandoc_query("--list-input-formats").stdout.strip().splitlines()
    _OUTPUT_FORMATS = _pandoc_query("--list-output-formats").stdout.strip().splitlines()
    _INPUT_SET = set(_INPUT_FORMATS)
    _OUTPUT_SET = set(_OUTPUT_FORMATS)
except Exception as exc:
    raise RuntimeError(f"Could not query pandoc formats: {exc}") from exc


@app.get("/")
def index():
    return app.send_static_file("index.html")


@app.get("/api/formats")
def formats():
    return jsonify(input=_INPUT_FORMATS, output=_OUTPUT_FORMATS)


@app.get("/api/defaults")
def defaults():
    """Return available pandoc defaults files as {label, value} pairs."""
    files = sorted(PANDOC_DIR.glob("*.yaml"))
    return jsonify([
        {"label": f.stem, "value": str(f)}
        for f in files
    ])


@app.post("/api/convert")
def convert():
    from_fmt     = (request.form.get("from")        or "").strip()
    to_fmt       = (request.form.get("to")          or "").strip()
    defaults_val = (request.form.get("defaults")    or "").strip()
    extra_raw    = (request.form.get("extra_flags") or "").strip()

    # When a defaults file is chosen it supplies from/to itself, so they become
    # optional.  Without a defaults file both are required.
    using_defaults = bool(defaults_val)

    if not using_defaults and (not from_fmt or not to_fmt):
        return jsonify(error="'from' and 'to' formats are required"), 400

    if from_fmt and from_fmt not in _INPUT_SET:
        return jsonify(error=f"Unknown input format: {from_fmt!r}"), 400
    if to_fmt and to_fmt not in _OUTPUT_SET:
        return jsonify(error=f"Unknown output format: {to_fmt!r}"), 400

    if using_defaults:
        # Resolve the path and make sure it lives inside PANDOC_DIR.
        defaults_path = Path(defaults_val).resolve()
        if not defaults_path.is_relative_to(PANDOC_DIR.resolve()):
            return jsonify(error="Invalid defaults path"), 400
        if not defaults_path.exists():
            return jsonify(error=f"Defaults file not found: {defaults_path.name}"), 400

    # extra_flags are parsed with shlex — never concatenated into a shell string.
    try:
        extra_args = shlex.split(extra_raw) if extra_raw else []
    except ValueError as exc:
        return jsonify(error=f"Invalid extra flags: {exc}"), 400

    upload = request.files.get("file")
    if upload and upload.filename:
        content = upload.read()
    elif "content" in request.form:
        content = request.form["content"].encode()
    else:
        return jsonify(error="No input provided"), 400

    # Infer output extension: prefer explicit to_fmt, fall back to defaults stem.
    out_ext = to_fmt or (defaults_path.stem if using_defaults else "out")

    with tempfile.TemporaryDirectory() as tmp:
        in_path  = Path(tmp) / "input"
        out_path = Path(tmp) / f"output.{out_ext}"
        in_path.write_bytes(content)

        if using_defaults:
            cmd = (
                [PANDOC, "--defaults", str(defaults_path), str(in_path), "-o", str(out_path)]
                + extra_args
            )
        else:
            cmd = (
                [PANDOC, "-f", from_fmt, "-t", to_fmt, str(in_path), "-o", str(out_path)]
                + extra_args
            )

        try:
            result = subprocess.run(cmd, capture_output=True, timeout=TIMEOUT)
        except subprocess.TimeoutExpired:
            return jsonify(error="Pandoc timed out"), 504
        except FileNotFoundError:
            return jsonify(error="Pandoc executable not found on PATH"), 500

        if result.returncode != 0:
            stderr = result.stderr.decode("utf-8", errors="replace")
            return jsonify(error=stderr), 422

        output = out_path.read_bytes()

    effective_to = to_fmt or out_ext
    if effective_to in BINARY_FORMATS:
        mime = MIME_TYPES.get(effective_to, "application/octet-stream")
        return send_file(
            io.BytesIO(output),
            mimetype=mime,
            as_attachment=True,
            download_name=f"output.{effective_to}",
        )

    return jsonify(output=output.decode("utf-8", errors="replace"))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
