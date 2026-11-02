import { Icon } from "@/components/icons";

export function VideoModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

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
        <div className="video-dialog-placeholder">
          <Icon name="play" size={30} />
        </div>
        <h2 id="video-dialog-title">Video kampus segera hadir</h2>
        <p>Cuplikan kehidupan Universitas LIA akan ditampilkan di sini.</p>
      </div>
    </div>
  );
}
