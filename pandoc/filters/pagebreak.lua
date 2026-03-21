-- Insert page breaks at level-1 headers for PDF/LaTeX output.
-- If metadata.pagebreak.toc is true, break before the first H1 as well.

local seen_first_h1 = true
-- set to false if there is not TOC


function Header(el)
  if FORMAT ~= "latex" and FORMAT ~= "pdf" then
    return nil
  end

  if el.level ~= 1 then
    return nil
  end

  if not seen_first_h1 then
    seen_first_h1 = true
    return nil
  end

  return {
    pandoc.RawBlock("latex", "\\clearpage"),
    el,
  }
end
