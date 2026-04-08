/* global state */
let uploadedFile = null;

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

  zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));

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
  const mode       = document.querySelector('input[name="mode"]:checked').value;
  const from       = document.getElementById("from-select").value;
  const to         = document.getElementById("to-select").value;
  const defaultsVal = document.getElementById("defaults-select").value;
  const extraFlags = document.getElementById("extra-flags").value.trim();

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
    showOutput(data.output);
  } else {
    /* binary — derive filename from Content-Disposition if present */
    const disp  = res.headers.get("Content-Disposition") || "";
    const match = disp.match(/filename="([^"]+)"/);
    const fname = match ? match[1] : `output.${to}`;
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
    });
  });
}

/* ── UI helpers ──────────────────────────────────────────────── */

function showOutput(text) {
  document.getElementById("output-pre").textContent = text;
  document.getElementById("output-section").hidden = false;
  document.getElementById("error-box").hidden = true;
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

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  /* show a notice in the output area */
  showOutput(`Binary output downloaded as "${filename}".`);
}

/* ── Boot ────────────────────────────────────────────────────── */

document.addEventListener("DOMContentLoaded", () => {
  loadFormats();
  setupTabs();
  setupDropZone();
  setupForm();
  setupCopyButton();
});
