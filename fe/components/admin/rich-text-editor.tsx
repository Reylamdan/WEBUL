"use client";

import { useCallback, useEffect, useRef } from "react";

const LINK_PATTERN = /^(https?:\/\/|mailto:|tel:)/i;

// ---------- Editor isi tulisan ----------
// Backend hanya menerima HTML terbatas (p, h2-h4, strong/b, em/i, ul/ol/li, blockquote, a, br) dan
// membersihkan sisanya. Editor ini hanya membuat tag-tag itu, lalu `normalizeHtml` merapikan hasilnya.

const INLINE_TAGS = new Set(["STRONG", "B", "EM", "I", "A", "BR", "SPAN"]);

export function normalizeHtml(raw: string): string {
  const source = document.createElement("div");
  source.innerHTML = raw;
  const out = document.createElement("div");
  let loose: HTMLParagraphElement | null = null;

  for (const node of Array.from(source.childNodes)) {
    const isText = node.nodeType === Node.TEXT_NODE;
    const isInline = node instanceof HTMLElement && INLINE_TAGS.has(node.tagName);

    // Teks/tag inline yang berada langsung di akar dibungkus <p> agar paragrafnya tidak hilang.
    if (isText || isInline) {
      if (isText && !(node.textContent ?? "").trim() && !loose) continue;
      if (!loose) {
        loose = document.createElement("p");
        out.appendChild(loose);
      }
      loose.appendChild(node.cloneNode(true));
      continue;
    }

    loose = null;
    if (node instanceof HTMLElement && node.tagName === "DIV") {
      const paragraph = document.createElement("p");
      paragraph.innerHTML = node.innerHTML;
      out.appendChild(paragraph);
    } else {
      out.appendChild(node.cloneNode(true));
    }
  }

  // Paragraf kosong (hasil menekan Enter berulang) dibuang.
  out.querySelectorAll("p").forEach((p) => {
    if (!(p.textContent ?? "").trim()) p.remove();
  });
  return out.innerHTML.trim();
}

export function hasText(html: string): boolean {
  const box = document.createElement("div");
  box.innerHTML = html;
  return (box.textContent ?? "").trim().length > 0;
}

type Tool = { label: string; title: string; run: (exec: (command: string, value?: string) => void) => void };

const TOOLS: Tool[] = [
  { label: "B", title: "Tebal", run: (exec) => exec("bold") },
  { label: "I", title: "Miring", run: (exec) => exec("italic") },
  { label: "H2", title: "Judul bagian", run: (exec) => exec("formatBlock", "<h2>") },
  { label: "H3", title: "Sub judul", run: (exec) => exec("formatBlock", "<h3>") },
  { label: "P", title: "Paragraf biasa", run: (exec) => exec("formatBlock", "<p>") },
  { label: "• Daftar", title: "Daftar poin", run: (exec) => exec("insertUnorderedList") },
  { label: "1. Daftar", title: "Daftar bernomor", run: (exec) => exec("insertOrderedList") },
  { label: "Kutipan", title: "Kutipan", run: (exec) => exec("formatBlock", "<blockquote>") },
  {
    label: "Tautan",
    title: "Tambah tautan pada teks terpilih",
    run: (exec) => {
      const url = window.prompt("Alamat tautan (diawali https://, mailto: atau tel:)");
      if (!url) return;
      if (!LINK_PATTERN.test(url.trim())) {
        window.alert("Tautan harus diawali https://, http://, mailto: atau tel:.");
        return;
      }
      exec("createLink", url.trim());
    },
  },
  { label: "Hapus format", title: "Hapus format teks terpilih", run: (exec) => exec("removeFormat") },
];

export function RichTextEditor({
  initialHtml,
  onChange,
  disabled,
  labelledBy,
}: {
  initialHtml: string;
  onChange: (html: string) => void;
  disabled: boolean;
  labelledBy: string;
}) {
  const area = useRef<HTMLDivElement>(null);

  // Isi awal dipasang sekali. Setelah itu DOM editor yang menjadi sumber kebenaran (uncontrolled),
  // supaya posisi kursor tidak melompat. initialHtml berasal dari backend yang sudah disanitasi.
  useEffect(() => {
    if (area.current) area.current.innerHTML = initialHtml;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = useCallback(() => onChange(area.current?.innerHTML ?? ""), [onChange]);

  const exec = useCallback(
    (command: string, value?: string) => {
      area.current?.focus();
      document.execCommand(command, false, value);
      emit();
    },
    [emit],
  );

  function handleFocus() {
    // Enter membuat <p>, bukan <div>.
    document.execCommand("defaultParagraphSeparator", false, "p");
    document.execCommand("styleWithCSS", false, "false");
  }

  // Tempel selalu sebagai teks polos agar format/atribut dari Word atau web tidak ikut masuk.
  function handlePaste(event: React.ClipboardEvent) {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    emit();
  }

  return (
    <div className="bt-editor">
      <div aria-label="Format teks" className="bt-toolbar" role="toolbar">
        {TOOLS.map((tool) => (
          <button
            className="bt-tool"
            disabled={disabled}
            key={tool.label}
            // mouseDown dicegah supaya teks yang terpilih tidak kehilangan fokus saat tombol ditekan.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => tool.run(exec)}
            title={tool.title}
            type="button"
          >
            {tool.label}
          </button>
        ))}
      </div>
      <div
        aria-labelledby={labelledBy}
        aria-multiline="true"
        className="bt-area"
        contentEditable={!disabled}
        data-placeholder="Tulis isi di sini..."
        onFocus={handleFocus}
        onInput={emit}
        onPaste={handlePaste}
        ref={area}
        role="textbox"
        suppressContentEditableWarning
      />
    </div>
  );
}
