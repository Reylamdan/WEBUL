"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/icons";
import {
  assistantApi,
  errorMessage,
  isAbortError,
  type AssistantCitation,
  type AssistantFallback,
  type AssistantHistoryMessage,
} from "@/lib/api";
import { citationHref } from "@/lib/content-routes";

// Pintasan pertanyaan. Jawabannya selalu berasal dari backend (/api/assistant/chat), bukan teks statis.
const quickQuestions = [
  { id: "pmb", label: "Penerimaan mahasiswa", question: "Bagaimana proses penerimaan mahasiswa baru di Universitas LIA?" },
  { id: "program-studi", label: "Program studi", question: "Program studi apa saja yang tersedia di Universitas LIA?" },
  { id: "biaya", label: "Biaya kuliah", question: "Berapa biaya kuliah dan bagaimana cara pembayarannya?" },
  { id: "kontak", label: "Hubungi petugas", question: "Bagaimana cara menghubungi petugas Universitas LIA?" },
] as const;

// Batas dari backend (assistantValidator): pertanyaan 2000 karakter, riwayat 6 pesan @ 2000 karakter.
const MAX_QUESTION = 2000;
const MAX_HISTORY = 6;

type ChatMessage =
  | { id: number; role: "user"; text: string }
  | {
      id: number;
      role: "assistant";
      text: string;
      citations: AssistantCitation[];
      fallback: AssistantFallback | null;
      isError?: boolean;
    };

export function VirtualAssistant() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const nextId = useRef(1);

  const closeAssistant = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  // Percakapan disimpan selama sesi halaman (state komponen), jadi tetap ada saat panel ditutup lalu dibuka lagi.
  const toggleAssistant = () => setIsOpen((open) => !open);

  useEffect(() => {
    if (!isOpen) return;

    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Batalkan permintaan yang masih berjalan saat komponen dilepas.
  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const element = contentRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, pending, isOpen]);

  async function ask(rawQuestion: string) {
    const question = rawQuestion.trim();
    if (!question || pending) return;

    // Riwayat hanya berisi giliran yang berhasil dijawab agar konteks yang dikirim tetap bersih.
    const history: AssistantHistoryMessage[] = messages
      .filter((message) => message.role === "user" || !message.isError)
      .map((message) => ({ role: message.role, content: message.text.slice(0, 2000) }))
      .filter((message) => message.content.trim() !== "")
      .slice(-MAX_HISTORY);

    setMessages((current) => [...current, { id: nextId.current++, role: "user", text: question }]);
    setInput("");
    setPending(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const reply = await assistantApi.chat(question, history, controller.signal);
      const text = reply.answerable && reply.answer ? reply.answer : (reply.fallback?.message ?? "Informasi tersebut belum tersedia.");
      setMessages((current) => [
        ...current,
        {
          id: nextId.current++,
          role: "assistant",
          text,
          citations: reply.answerable ? reply.citations : [],
          fallback: reply.answerable ? null : reply.fallback,
        },
      ]);
    } catch (error) {
      if (isAbortError(error)) return;
      setMessages((current) => [
        ...current,
        { id: nextId.current++, role: "assistant", text: errorMessage(error), citations: [], fallback: null, isError: true },
      ]);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setPending(false);
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(input);
  }

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <div className="virtual-assistant">
      {isOpen && (
        <div
          aria-labelledby="virtual-assistant-title"
          className="virtual-assistant-panel"
          id="virtual-assistant-panel"
          role="dialog"
        >
          <header className="virtual-assistant-header">
            <div className="virtual-assistant-identity">
              <span aria-hidden="true" className="virtual-assistant-avatar">
                <Icon name="sparkle" size={20} />
              </span>
              <div>
                <h2 id="virtual-assistant-title">Virtual Assistance</h2>
                <span className="virtual-assistant-status">Siap membantu</span>
              </div>
            </div>
            <button
              aria-label="Tutup Virtual Assistance"
              className="virtual-assistant-close"
              onClick={closeAssistant}
              ref={closeRef}
              type="button"
            >
              <Icon name="x" size={18} />
            </button>
          </header>

          <div className="virtual-assistant-content" ref={contentRef}>
            <div className="virtual-assistant-message">
              <span aria-hidden="true" className="virtual-assistant-message-avatar">
                <Icon name="sparkle" size={14} />
              </span>
              <p className="virtual-assistant-welcome">
                Halo! Ada informasi yang bisa kami bantu?
              </p>
            </div>

            {messages.length === 0 && (
              <div aria-label="Pilih topik bantuan" className="virtual-assistant-topics">
                <span className="virtual-assistant-prompt">Pilih topik atau ketik pertanyaan</span>
                {quickQuestions.map((topic) => (
                  <button
                    className="virtual-assistant-topic"
                    disabled={pending}
                    key={topic.id}
                    onClick={() => void ask(topic.question)}
                    type="button"
                  >
                    {topic.label}
                  </button>
                ))}
              </div>
            )}

            <div aria-live="polite" className="virtual-assistant-thread">
              {messages.map((message) =>
                message.role === "user" ? (
                  <div className="virtual-assistant-message virtual-assistant-message-user" key={message.id}>
                    <p className="virtual-assistant-user-bubble">{message.text}</p>
                  </div>
                ) : (
                  <div className="virtual-assistant-message virtual-assistant-answer" key={message.id}>
                    <span aria-hidden="true" className="virtual-assistant-message-avatar">
                      <Icon name="sparkle" size={14} />
                    </span>
                    <div
                      className={`virtual-assistant-response${message.isError ? " is-error" : ""}`}
                      role={message.isError ? "alert" : undefined}
                    >
                      {/* Jawaban AI dirender sebagai teks biasa (bukan HTML) agar aman dari injeksi markup. */}
                      <p className="virtual-assistant-answer-text">{message.text}</p>

                      {message.citations.length > 0 && (
                        <div className="virtual-assistant-sources">
                          <span className="virtual-assistant-sources-label">Sumber</span>
                          <ul>
                            {message.citations.map((citation) => {
                              const link = citationHref(citation);
                              return (
                                <li key={citation.id}>
                                  {link ? (
                                    link.external ? (
                                      <a
                                        className="virtual-assistant-response-link"
                                        href={link.href}
                                        rel="noopener noreferrer"
                                        target="_blank"
                                      >
                                        {citation.title}
                                      </a>
                                    ) : (
                                      <Link className="virtual-assistant-response-link" href={link.href} onClick={closeAssistant}>
                                        {citation.title}
                                      </Link>
                                    )
                                  ) : (
                                    <span>{citation.title}</span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}

                      {message.fallback?.url && (
                        <a
                          className="virtual-assistant-response-link"
                          href={message.fallback.url}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          Hubungi melalui WhatsApp
                          <Icon name="arrow" size={15} />
                        </a>
                      )}
                    </div>
                  </div>
                ),
              )}

              {pending && (
                <div className="virtual-assistant-message virtual-assistant-answer" role="status">
                  <span aria-hidden="true" className="virtual-assistant-message-avatar">
                    <Icon name="sparkle" size={14} />
                  </span>
                  <div className="virtual-assistant-response">
                    <p className="virtual-assistant-typing">
                      <span className="sr-only">Asisten sedang menyusun jawaban</span>
                      <span aria-hidden="true" />
                      <span aria-hidden="true" />
                      <span aria-hidden="true" />
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="virtual-assistant-contact">
              <span className="virtual-assistant-contact-label">
                Butuh bantuan langsung?
              </span>
              <a
                className="virtual-assistant-contact-link is-whatsapp"
                href="https://wa.me/6285881036948"
                rel="noreferrer"
                target="_blank"
              >
                <Icon name="message" size={15} />
                WhatsApp
              </a>
              <a
                className="virtual-assistant-contact-link"
                href="mailto:humas@universitaslia.ac.id"
              >
                <span aria-hidden="true" className="virtual-assistant-email-icon">
                  @
                </span>
                Email
              </a>
            </div>
          </div>

          <form className="virtual-assistant-form" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="virtual-assistant-input">
              Tulis pertanyaan Anda
            </label>
            <input
              autoComplete="off"
              className="virtual-assistant-input"
              disabled={pending}
              id="virtual-assistant-input"
              maxLength={MAX_QUESTION}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Tulis pertanyaan Anda..."
              type="text"
              value={input}
            />
            <button
              aria-label="Kirim pertanyaan"
              className="virtual-assistant-send"
              disabled={pending || input.trim() === ""}
              type="submit"
            >
              <Icon name="arrow" size={17} />
            </button>
          </form>
        </div>
      )}

      <button
        aria-controls={isOpen ? "virtual-assistant-panel" : undefined}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={isOpen ? "Tutup Virtual Assistance" : "Buka Virtual Assistance"}
        className="virtual-assistant-toggle"
        onClick={toggleAssistant}
        ref={triggerRef}
        type="button"
      >
        <Icon name={isOpen ? "x" : "message"} size={21} />
      </button>
    </div>
  );
}
