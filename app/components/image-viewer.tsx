import { useRef } from 'react';
import { normalizeSourceUrl } from '../content/reader';
import type { Figure } from '../content/types';

export function ImageViewer({ figure }: { figure: Figure }): React.JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const src = normalizeSourceUrl(figure.src);

  function open() {
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button ref={openerRef} type="button" onClick={open}>
        View full-size image
      </button>
      <dialog
        ref={dialogRef}
        className="guide-image-viewer"
        aria-label={`Full-size image: ${figure.caption}`}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={() => openerRef.current?.focus()}
      >
        <div className="guide-image-viewer__toolbar">
          <span>Full-size: {figure.caption}</span>
          {src && (
            <a href={src} aria-label={`Open original image: ${figure.alt}`}>
              Open original image
            </a>
          )}
          <button type="button" onClick={close}>
            Close image
          </button>
        </div>
        <div className="guide-image-viewer__content">
          {src ? (
            <img
              src={src}
              alt={figure.alt}
              width={figure.width}
              height={figure.height}
              loading="lazy"
            />
          ) : (
            <p>Image unavailable: {figure.alt}</p>
          )}
        </div>
      </dialog>
    </>
  );
}
