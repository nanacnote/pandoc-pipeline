-- tts.lua – rewrite the document AST to add spoken cues suitable for
-- text-to-speech engines.
--
-- Usage:
--   pandoc input.md -t plain --lua-filter=pandoc/filters/tts.lua -o output.txt
--
-- What it does:
--   • Headings        → "Heading one: Introduction."
--   • Bullet items    → "Bullet point: …"
--   • Ordered items   → "Item 1: …"
--   • Code blocks     → "Code block in bash." (code itself is skipped)
--   • Block quotes    → "Quote: …"
--   • Tables          → narrates caption + each cell value

local stringify = pandoc.utils.stringify

-- Level numbers as words for natural speech
local level_words = { "one", "two", "three", "four", "five", "six" }

-- Flatten a list of blocks into a single plain-text string.
local function blocks_to_text(blocks)
  return stringify(pandoc.Div(blocks))
end

-- Wrap a spoken cue and content text into a plain Para.
local function spoken(cue, text)
  local full = text ~= "" and (cue .. text) or cue
  return pandoc.Para { pandoc.Str(full) }
end

function Header(el)
  local word = level_words[el.level] or tostring(el.level)
  local title = stringify(el)
  return spoken("Heading " .. word .. ": ", title .. ".")
end

function BulletList(el)
  local paras = {}
  for _, item in ipairs(el.content) do
    local text = blocks_to_text(item)
    paras[#paras + 1] = spoken("Bullet point: ", text)
  end
  return paras
end

function OrderedList(el)
  local paras = {}
  for i, item in ipairs(el.content) do
    local text = blocks_to_text(item)
    paras[#paras + 1] = spoken("Item " .. i .. ": ", text)
  end
  return paras
end

function CodeBlock(el)
  local lang = (el.classes and el.classes[1]) or "unknown"
  return spoken("Code block in " .. lang .. ".", "")
end

function BlockQuote(el)
  local text = blocks_to_text(el.content)
  return spoken("Quote: ", text)
end

function Table(el)
  local paras = {}

  -- Optional caption
  local caption_text = el.caption and stringify(el.caption) or ""
  if caption_text ~= "" then
    paras[#paras + 1] = spoken("Table: ", caption_text .. ".")
  else
    paras[#paras + 1] = spoken("Table.", "")
  end

  -- Header row
  if el.head and el.head.rows then
    for _, row in ipairs(el.head.rows) do
      local cells = {}
      for _, cell in ipairs(row.cells) do
        cells[#cells + 1] = stringify(pandoc.Div(cell.contents))
      end
      paras[#paras + 1] = spoken("Column headers: ", table.concat(cells, ", ") .. ".")
    end
  end

  -- Body rows
  for _, body in ipairs(el.bodies or {}) do
    for i, row in ipairs(body.body or {}) do
      local cells = {}
      for _, cell in ipairs(row.cells) do
        cells[#cells + 1] = stringify(pandoc.Div(cell.contents))
      end
      paras[#paras + 1] = spoken("Row " .. i .. ": ", table.concat(cells, ", ") .. ".")
    end
  end

  return paras
end
