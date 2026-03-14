# Pandoc HTML Defaults (with Diagrams)

A minimal, per-project setup for converting **Markdown → HTML** using Pandoc, with first-class support for **Mermaid and other diagrams** via `pandoc-ext-diagram`.

This project intentionally keeps things simple:

* You call `pandoc` yourself
* Input/output files are explicit
* All common flags live in a Pandoc **defaults file**

No wrapper scripts, no CSS, no templates.

---

## Project Structure

```
.
├─ pandoc/
│  ├─ filters/
│  │  └─ diagram.lua
│  ├─ html.yaml
│  ├─ html-fragment.yaml
│  └─ syntax-highlighting.css
│
└─ README.md
```
defaults for standalone HTML output
* `pandoc/html-fragment.yaml` — defaults for HTML fragments (no wrapper)
* `pandoc/syntax-highlighting.css` — reusable CSS for code syntax highlighting
* `pandoc/filters/diagram.lua` — vendored `pandoc-ext-diagram` Lua filter
* `pandoc/html.yaml` — project defaults (acts like an rc file)
* `README.md` — setup and usage instructions

---

## Requirements

**Required:**
- Pandoc **3.0+** 

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

**Fedora:**
```bash
sudo dnf install pandoc
```

**Verify:**
```bash
pandoc --version
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

**Fedora:**
```bash
sudo dnf install graphviz
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

---

The defaults files bundle:
- HTML5 output with styling
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

Or create new defaults files for different outputs (PDF, slides, EPUB, etc.):

```bash
pandoc --defaults pandoc/pdf.yaml input.md -o output.pdf
```

### Supported Diagram Types

Use the appropriate code fence based on what you have installed:

| Engine | Fence | Binary |
|--------|-------|--------|
| **Mermaid** | ` ```mermaid ` | `mmdc` |
| **Graphviz** | ` ```dot ` | `dot` |
| **PlantUML** | ` ```plantuml ` | `plantuml` |
| **TikZ** | ` ```tikz ` | `pdflatex` |
| **Asymptote** | ` ```asymptote ` | `asy` |
| **D2** | ` ```d2 ` | `d2` |
| **Cetz** | ` ```cetz ` | `typst` |

---

## Customizing Output

To create a new defaults file for different output (PDF, slides, EPUB):

```bash
pandoc/pdf.yaml      # for PDF generation
pandoc/slides.yaml   # for HTML5 slides
pandoc/epub.yaml     # for EPUB output
```

Then use it:
```bash
pandoc --defaults pandoc/pdf.yaml input.md -o output.pdf
```
