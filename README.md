# Pandoc Pipeline

A minimal, per-project setup for converting **Markdown** to multiple output formats using Pandoc, with first-class support for **Mermaid and other diagrams** via `pandoc-ext-diagram`.

Supported outputs:
- **HTML** — standalone documents or fragments for embedding
- **PDF** — print-quality documents via XeLaTeX

This project intentionally keeps things simple:

* You call `pandoc` yourself
* Input/output files are explicit
* All common flags live in a Pandoc **defaults file**

No wrapper scripts, no templates.

---

## Project Structure

```
.
├─ pandoc/
│  ├─ filters/
│  │  ├─ diagram.lua
│  │  └─ pagebreak.lua
│  ├─ templates/
│  │  └─ toc.html
│  ├─ html.yaml
│  ├─ html-fragment.yaml
│  ├─ html-toc.yaml
│  ├─ pdf.yaml
│  └─ syntax-highlighting.css
│
└─ README.md
```

* `pandoc/html.yaml` — defaults for standalone HTML output
* `pandoc/html-fragment.yaml` — defaults for HTML fragments (no wrapper)
* `pandoc/html-toc.yaml` — outputs **only the TOC** as a collapsible `<details>` block (no document body)
* `pandoc/pdf.yaml` — defaults for PDF output via XeLaTeX
* `pandoc/syntax-highlighting.css` — reusable CSS for code syntax highlighting
* `pandoc/filters/diagram.lua` — vendored `pandoc-ext-diagram` Lua filter
* `pandoc/filters/pagebreak.lua` — portable page break filter
* `pandoc/templates/toc.html` — template that wraps the TOC in a collapsible `<details>` block

---

## Requirements

**Required:**
- Pandoc **3.0+**

**Required for PDF output:**
- XeLaTeX — part of TeX Live or MacTeX

**Optional (for diagram rendering):**
- Graphviz (`dot`) — for graph diagrams
- Mermaid CLI (`mmdc`) — for flowcharts, sequence, state, etc.
- PlantUML, TikZ, Asymptote, D2, Cetz — additional diagram engines

The `pandoc-ext-diagram` Lua filter is **bundled** at `pandoc/filters/diagram.lua`.

---

## Install

### Pandoc

**Ubuntu / Debian:**
```bash
sudo apt update && sudo apt install pandoc
```

**macOS (Homebrew):**
```bash
brew install pandoc
```

### XeLaTeX (required for PDF output)

**Ubuntu / Debian:**
```bash
sudo apt install texlive-xetex texlive-fonts-recommended texlive-latex-extra
```

**macOS:**
```bash
brew install --cask mactex
```

### Diagram Engines (Optional)

#### Graphviz (dot)
**Ubuntu / Debian:**
```bash
sudo apt install graphviz
```

**macOS:**
```bash
brew install graphviz
```

#### Mermaid CLI
```bash
npm install -g @mermaid-js/mermaid-cli
```

#### PlantUML
**Ubuntu / Debian:**
```bash
sudo apt install plantuml
```

**macOS:**
```bash
brew install plantuml
```

#### TikZ (LaTeX)
**Ubuntu / Debian:**
```bash
sudo apt install texlive-latex-base texlive-fonts-recommended texlive-latex-extra
```

**macOS:**
```bash
brew install mactex
```

#### Other engines
Refer to upstream project docs:
- [D2 language](https://d2lang.com/)
- [Asymptote](https://asymptote.sourceforge.io/)
- [Typst/Cetz](https://typst.app/)

---

## Usage

### Standalone HTML (complete document)

```bash
pandoc --defaults pandoc/html.yaml input.md -o output.html
```

Generates a complete HTML file with `<html>`, `<head>`, and `<body>` tags.

### HTML with Collapsible TOC

```bash
pandoc --defaults pandoc/html-toc.yaml input.md -o output.html
```

Outputs **only the table of contents** — no document body. The `toc.html` template renders just the TOC wrapped in a collapsible `<details>` block, making it suitable for injecting a standalone nav into an existing page.

### HTML Fragment (for insertion into existing HTML)

```bash
pandoc --defaults pandoc/html-fragment.yaml input.md -o content.html
```

Generates just the body content for injecting into an existing page.

#### Using with Existing Stylesheets

When generating HTML fragments for insertion into your existing pages, include the pre-extracted syntax highlighting CSS once in your main stylesheet:

```css
/* Add contents of pandoc/syntax-highlighting.css to your main.css */
```

The `pandoc/syntax-highlighting.css` file contains all Pandoc pygments syntax highlighting rules. Include it once in your codebase to ensure consistent code block styling across all generated fragments.

### PDF

```bash
pandoc --defaults pandoc/pdf.yaml input.md -o output.pdf
```

Generates a print-ready PDF via XeLaTeX with a table of contents, numbered sections, and coloured hyperlinks.

---

Each defaults file bundles sensible defaults for its output format:
- Table of contents
- Diagram rendering (mermaid, dot, plantuml, tikz, etc.)
- Syntax highlighting
- Task lists, pipe tables, etc.

You can override any option at runtime:

```bash
pandoc --defaults pandoc/html.yaml \
  --toc-depth=2 \
  --css custom.css \
  input.md -o output.html
```

### Supported Diagram Types

Use the appropriate code fence based on what you have installed:

| Engine        | Fence            | Binary     |
| ------------- | ---------------- | ---------- |
| **Mermaid**   | ` ```mermaid `   | `mmdc`     |
| **Graphviz**  | ` ```dot `       | `dot`      |
| **PlantUML**  | ` ```plantuml `  | `plantuml` |
| **TikZ**      | ` ```tikz `      | `pdflatex` |
| **Asymptote** | ` ```asymptote ` | `asy`      |
| **D2**        | ` ```d2 `        | `d2`       |
| **Cetz**      | ` ```cetz `      | `typst`    |

---

## Copilot Chat

A `/pandoc-build` prompt is included for running conversions directly from VS Code chat.

Type `/pandoc-build` followed by your request:

```
/pandoc-build tests/input.md as html
/pandoc-build convert local/blog-post-home-paas.md to pdf
/pandoc-build tests/input.md to both full html and pdf
```

The prompt will show you the exact commands before running them and ask for confirmation. It backs up the source file to `.bak/` at the project root before writing any output.

---

## Adding More Outputs

To add a new output format, create a defaults file in `pandoc/` and pass it with `--defaults`:

```bash
pandoc --defaults pandoc/slides.yaml input.md -o output.html  # HTML5 slides
pandoc --defaults pandoc/epub.yaml input.md -o output.epub    # EPUB
```
