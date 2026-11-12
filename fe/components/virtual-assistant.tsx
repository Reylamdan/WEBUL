"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";

const assistanceTopics = [
  {
    id: "pmb",
    label: "Penerimaan mahasiswa",
    response:
      "Informasi jalur pendaftaran, periode, dan proses penerimaan mahasiswa baru tersedia di halaman PMB.",
    href: "/pmb",
    linkLabel: "Buka informasi PMB",
  },
  {
    id: "program-studi",
    label: "Program studi",
    response:
      "Jelajahi fakultas dan program studi yang tersedia di Universitas LIA.",
    href: "/akademik/fakultas",
    linkLabel: "Lihat fakultas",
  },
  {
    id: "biaya",
    label: "Biaya kuliah",
    response:
      "Informasi biaya kuliah dan cara pembayaran dapat dilihat di halaman PMB.",
    href: "/pmb/biaya-kuliah",
    linkLabel: "Lihat biaya kuliah",
  },
  {
    id: "kontak",
    label: "Hubungi petugas",
    response:
      "Silakan hubungi tim Universitas LIA melalui WhatsApp atau email.",
  },
] as const;

type TopicId = (typeof assistanceTopics)[number]["id"];

export function VirtualAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<TopicId | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const activeTopic = assistanceTopics.find(
    (topic) => topic.id === selectedTopic,
  );

  const closeAssistant = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const toggleAssistant = () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    setSelectedTopic(null);
    setIsOpen(true);
  };

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

          <div className="virtual-assistant-content">
            <div className="virtual-assistant-message">
              <span aria-hidden="true" className="virtual-assistant-message-avatar">
                <Icon name="sparkle" size={14} />
              </span>
              <p className="virtual-assistant-welcome">
                Halo! Ada informasi yang bisa kami bantu?
              </p>
            </div>

            <div
              aria-label="Pilih topik bantuan"
              className="virtual-assistant-topics"
            >
              <span className="virtual-assistant-prompt">
                Pilih topik untuk mulai
              </span>
              {assistanceTopics.map((topic) => (
                <button
                  aria-pressed={selectedTopic === topic.id}
                  className={`virtual-assistant-topic${selectedTopic === topic.id ? " is-selected" : ""}`}
                  key={topic.id}
                  onClick={() => setSelectedTopic(topic.id)}
                  type="button"
                >
                  {topic.label}
                </button>
              ))}
            </div>

            {activeTopic && (
              <div
                aria-live="polite"
                className="virtual-assistant-message virtual-assistant-answer"
                key={activeTopic.id}
              >
                <span aria-hidden="true" className="virtual-assistant-message-avatar">
                  <Icon name="sparkle" size={14} />
                </span>
                <div className="virtual-assistant-response">
                  <p>{activeTopic.response}</p>
                  {"href" in activeTopic && (
                    <Link
                      className="virtual-assistant-response-link"
                      href={activeTopic.href}
                    >
                      {activeTopic.linkLabel}
                      <Icon name="arrow" size={15} />
                    </Link>
                  )}
                </div>
              </div>
            )}

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
