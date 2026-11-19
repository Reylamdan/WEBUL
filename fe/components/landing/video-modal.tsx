"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import type { HomepageVideo } from "@/lib/homepage-api";

export function VideoModal({
  isOpen,
  onClose,
  videos = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  videos?: HomepageVideo[];
}) {
  const [index, setIndex] = useState(0);

  if (!isOpen) return null;

  const current = videos[Math.min(index, videos.length - 1)];

  return (
    <div
      aria-labelledby="video-dialog-title"
      aria-modal="true"
      className="video-dialog-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
    >
      <div className="video-dialog">
        <button
          aria-label="Tutup video"
          className="video-dialog-close"
          onClick={onClose}
          type="button"
        >
          <Icon name="x" size={20} />
        </button>
        {current?.video ? (
          <>
            <video
              autoPlay
              className="video-dialog-player"
              controls
              key={current.id}
              playsInline
              poster={current.video.thumbnailUrl ?? undefined}
              src={current.video.url}
            />
            <h2 id="video-dialog-title">{current.title}</h2>
            {current.description ? <p>{current.description}</p> : null}
            {videos.length > 1 ? (
              <div className="video-dialog-list">
                {videos.map((item, i) => (
                  <button
                    aria-current={i === index ? "true" : undefined}
                    className={i === index ? "is-current" : ""}
                    key={item.id}
                    onClick={() => setIndex(i)}
                    type="button"
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="video-dialog-placeholder">
              <Icon name="play" size={30} />
            </div>
            <h2 id="video-dialog-title">Video kampus segera hadir</h2>
            <p>Cuplikan kehidupan Universitas LIA akan ditampilkan di sini.</p>
          </>
        )}
      </div>
    </div>
  );
}
