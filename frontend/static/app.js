/* global state */
let uploadedFile = null;
let lastOutputExt = "txt";

/* ── Pandoc format → file extension map ─────────────────────── */
const FORMAT_EXT = {
  html5: "html", html4: "html",
  plain: "txt",
  latex: "tex", context: "tex",
  markdown: "md", gfm: "md",
  rst: "rst",
  asciidoc: "adoc", asciidoctor: "adoc",
  texinfo: "texi",
  mediawiki: "wiki",
};

function formatToExt(fmt) {
  return FORMAT_EXT[fmt] || fmt;
}

/* ── Format selects ─────────────────────────────────────────── */

async function loadFormats() {
  const res = await fetch("/api/formats");
  if (!res.ok) {
    showError("Could not load pandoc format list.");
    return;
  }
  const data = await res.json();
  populateSelect("from-select", data.input, "markdown");
  populateSelect("to-select",   data.output, "html5");
  await loadDefaults();
}

async function loadDefaults() {
  const res = await fetch("/api/defaults");
  if (!res.ok) return;
  const items = await res.json();
  const sel = document.getElementById("defaults-select");
  for (const item of items) {
    const opt = document.createElement("option");
    opt.value = item.value;
    opt.textContent = item.label;
    opt.dataset.ext = item.ext || item.label;
    sel.appendChild(opt);
  }
}

function populateSelect(id, formats, defaultValue) {
  const sel = document.getElementById(id);
  sel.innerHTML = "";
  for (const fmt of formats) {
    const opt = document.createElement("option");
    opt.value = fmt;
    opt.textContent = fmt;
    if (fmt === defaultValue) opt.selected = true;
    sel.appendChild(opt);
  }
}

/* ── Tab switching (paste / upload) ─────────────────────────── */

function setupTabs() {
  document.querySelectorAll('input[name="mode"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      const isPaste = radio.value === "paste";
      document.getElementById("paste-section").hidden  = !isPaste;
      document.getElementById("upload-section").hidden =  isPaste;

      hideResults();
    });
  });
}

/* ── Drop zone ───────────────────────────────────────────────── */

function setupDropZone() {
  const zone      = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");
  const fileLabel = document.getElementById("file-name");
  const dropLabel = document.getElementById("drop-label");

  zone.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", () => {
    if (fileInput.files[0]) setUploadedFile(fileInput.files[0]);
  });

  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("drag-over");
  });

  zone.addEventListener("dragleave", (e) => {
    // Only remove the highlight when the pointer leaves the zone itself,
    // not when it moves over a child element (e.g. the label text).
    if (!zone.contains(e.relatedTarget)) zone.classList.remove("drag-over");
  });

  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("drag-over");
    if (e.dataTransfer.files[0]) setUploadedFile(e.dataTransfer.files[0]);
  });

  function setUploadedFile(file) {
    uploadedFile = file;
    fileLabel.textContent = file.name;
    fileLabel.hidden = false;
    dropLabel.hidden = true;
  }
}

/* ── Form submission ─────────────────────────────────────────── */

function setupForm() {
  const form = document.getElementById("convert-form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideResults();
    setLoading(true);

    try {
      await doConvert();
    } catch (err) {
      showError(String(err));
    } finally {
      setLoading(false);
    }
  });
}

async function doConvert() {
  const mode        = document.querySelector('input[name="mode"]:checked').value;
  const from        = document.getElementById("from-select").value;
  const to          = document.getElementById("to-select").value;
  const defaultsSel = document.getElementById("defaults-select");
  const defaultsVal = defaultsSel.value;
  // ext comes from the yaml's 'to:' field (stored as data-ext by loadDefaults).
  const defaultsExt = defaultsVal && defaultsSel.selectedOptions[0]
    ? defaultsSel.selectedOptions[0].dataset.ext || null
    : null;
  const extraFlags  = document.getElementById("extra-flags").value.trim();

  const fd = new FormData();
  if (defaultsVal) {
    fd.append("defaults", defaultsVal);
  } else {
    fd.append("from", from);
    fd.append("to",   to);
  }
  if (extraFlags) fd.append("extra_flags", extraFlags);

  if (mode === "paste") {
    const content = document.getElementById("content").value;
    if (!content.trim()) { showError("Nothing to convert — paste some text first."); return; }
    fd.append("content", content);
  } else {
    if (!uploadedFile) { showError("No file selected."); return; }
    fd.append("file", uploadedFile, uploadedFile.name);
  }

  const res = await fetch("/api/convert", { method: "POST", body: fd });
  const contentType = res.headers.get("Content-Type") || "";

  if (!res.ok) {
    let message;
    try {
      const data = await res.json();
      message = data.error || `HTTP ${res.status}`;
    } catch {
      message = `HTTP ${res.status}`;
    }
    showError(message);
    return;
  }

  if (contentType.includes("application/json")) {
    const data = await res.json();
    // Derive a sensible extension from the chosen format or defaults stem.
    const ext = formatToExt(defaultsExt || to || "txt");
    showOutput(data.output, ext);
  } else {
    /* binary — derive filename from Content-Disposition if present */
    const disp  = res.headers.get("Content-Disposition") || "";
    const match = disp.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
    const headerName = match ? decodeURIComponent(match[1] || match[2] || "") : "";
    const fallbackExt = formatToExt(defaultsExt || to || "out");
    const fname = headerName || `output.${fallbackExt}`;
    const blob  = await res.blob();
    triggerDownload(blob, fname);
  }
}

/* ── Copy button ─────────────────────────────────────────────── */

function setupCopyButton() {
  document.getElementById("copy-btn").addEventListener("click", () => {
    const text = document.getElementById("output-pre").textContent;
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById("copy-btn");
      const prev = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => (btn.textContent = prev), 1500);
    }).catch(() => {
      const btn = document.getElementById("copy-btn");
      btn.textContent = "Failed";
      setTimeout(() => (btn.textContent = "Copy"), 1500);
    });
  });
}

/* ── Download button ─────────────────────────────────────────── */

function setupDownloadButton() {
  document.getElementById("download-btn").addEventListener("click", () => {
    const text = document.getElementById("output-pre").textContent;
    const blob = new Blob([text], { type: "text/plain" });
    triggerDownload(blob, `output.${lastOutputExt}`);
  });
}

function setupDownloadImagesButton() {
  document.getElementById("download-images-btn").addEventListener("click", () => {
    const html = document.getElementById("output-pre").textContent || "";
    const artifacts = extractDataImageArtifacts(html);
    if (!artifacts.length) {
      const btn = document.getElementById("download-images-btn");
      const prev = btn.textContent;
      btn.textContent = "No embedded images";
      setTimeout(() => (btn.textContent = prev), 1500);
      return;
    }

    for (const artifact of artifacts) {
      const blob = b64ToBlob(artifact.contentB64, artifact.mimeType);
      triggerDownload(blob, artifact.filename, false);
    }

    const btn = document.getElementById("download-images-btn");
    const prev = btn.textContent;
    btn.textContent = `Downloaded ${artifacts.length}`;
    setTimeout(() => (btn.textContent = prev), 1500);
  });
}

/* ── UI helpers ──────────────────────────────────────────────── */

function showOutput(text, ext, hideActions) {
  lastOutputExt = ext || lastOutputExt;
  document.getElementById("output-pre").textContent = text;
  document.getElementById("output-section").hidden = false;
  document.getElementById("error-box").hidden = true;
  document.querySelector(".output-actions").hidden = !!hideActions;
  document.getElementById("download-images-btn").hidden = (lastOutputExt !== "html") || !!hideActions;
}

function showError(message) {
  document.getElementById("error-text").textContent = message;
  document.getElementById("error-box").hidden = false;
  document.getElementById("output-section").hidden = true;
}

function hideResults() {
  document.getElementById("output-section").hidden = true;
  document.getElementById("error-box").hidden = true;
}

function setLoading(loading) {
  const btn = document.getElementById("convert-btn");
  btn.disabled = loading;
  btn.textContent = loading ? "Converting…" : "Convert";
}

function triggerDownload(blob, filename, showNotice = true) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  if (showNotice) {
    /* show a notice in the output area */
    showOutput(`Binary output downloaded as "${filename}".`, null, true);
  }
}

function b64ToBlob(contentB64, mimeType) {
  const binary = atob(contentB64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

function extractDataImageArtifacts(html) {
  const matches = html.matchAll(/<img\b[^>]*\bsrc\s*=\s*(["'])(data:image\/[^"']+)\1/gi);
  const seen = new Map();
  let idx = 1;

  for (const match of matches) {
    const dataUri = match[2] || "";
    if (seen.has(dataUri)) continue;

    const parts = dataUri.split(",", 2);
    if (parts.length !== 2) continue;

    const meta = parts[0].slice(5);
    const payload = parts[1];
    const metaParts = meta.split(";").map((p) => p.trim().toLowerCase());
    const mimeType = metaParts[0] || "";
    if (!mimeType.startsWith("image/") || !metaParts.includes("base64")) continue;

    const ext = mimeTypeToExt(mimeType);
    seen.set(dataUri, {
      filename: `image-${String(idx).padStart(3, "0")}.${ext}`,
      mimeType,
      contentB64: payload,
    });
    idx += 1;
  }

  return [...seen.values()];
}

function mimeTypeToExt(mimeType) {
  const map = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "image/bmp": "bmp",
  };
  return map[mimeType] || "bin";
}

/* ── Boot ────────────────────────────────────────────────────── */

document.addEventListener("DOMContentLoaded", () => {
  // Sync section visibility with whichever radio the browser restored.
  const checked = document.querySelector('input[name="mode"]:checked');
  const isPaste = !checked || checked.value === "paste";
  document.getElementById("paste-section").hidden  = !isPaste;
  document.getElementById("upload-section").hidden =  isPaste;

  loadFormats();
  setupTabs();
  setupDropZone();
  setupForm();
  setupCopyButton();
  setupDownloadButton();
  setupDownloadImagesButton();
});
