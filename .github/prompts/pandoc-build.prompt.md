---
description: "Build pandoc output from a markdown file. Use when: converting markdown to HTML, PDF, or plain text, running pandoc, generating output beside input."
argument-hint: "e.g. tests/input.md as html"
agent: "agent"
tools: [run_in_terminal]
---

Convert the specified markdown file using the pandoc pipeline.

## Instructions

1. Parse the user's request to identify:
   - **Input file** — the `.md` file to convert (default: `tests/input.md`)
   - **Format** — one of: `html`, `html-fragment`, `html-toc`, `pdf`, `tts` (default: `html`)

2. Derive the output path by replacing the `.md` extension with the appropriate extension (`.html`, `.pdf`, or `.txt`) in the same directory as the input file.

3. Select the defaults file based on format:
   | Format          | Defaults file                       |
   | --------------- | ----------------------------------- |
   | `html`          | `pandoc/defaults/html.yaml`         |
   | `html-fragment` | `pandoc/defaults/html-fragment.yaml`|
   | `html-toc`      | `pandoc/defaults/html-toc.yaml`     |
   | `pdf`           | `pandoc/defaults/pdf.yaml`          |
   | `tts`           | `pandoc/defaults/tts.yaml`          |

4. Show the user the exact commands that will be run and ask for confirmation before proceeding:
   ```
   mkdir -p .bak
   cp <input-file> .bak/<input-filename>
   pandoc --defaults <defaults-file> <input-file> -o <output-file>
   ```
   Wait for the user to confirm before running anything.

5. Once confirmed, run the commands in order:
   - Create `.bak/` at the project root if it does not already exist
   - Copy the input file into `.bak/` (overwriting any previous backup)
   - Run the pandoc command from the workspace root

6. Report the output file path and the backup location when done.

## Examples

- "build tests/input.md as html" → `pandoc --defaults pandoc/defaults/html.yaml tests/input.md -o tests/input.html`
- "convert local/blog-post-home-paas.md to pdf" → `pandoc --defaults pandoc/defaults/pdf.yaml local/blog-post-home-paas.md -o local/blog-post-home-paas.pdf`
- "generate toc html for tests/input.md" → `pandoc --defaults pandoc/defaults/html-toc.yaml tests/input.md -o tests/input.html`
- "convert tests/input.md to tts" → `pandoc --defaults pandoc/defaults/tts.yaml tests/input.md -o tests/input.txt`
