import { useEffect } from 'react';
import { AlertCircleIcon, SpinnerIcon, TrashIcon } from './Icons';

/**
 * Modal dialog for confirming event deletion.
 * Prevents accidental destructive operations.
 */
export default function DeleteConfirmModal({
  isOpen,
  event,
  isDeleting,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isDeleting) {
        onCancel();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onCancel]);

  if (!isOpen || !event) return null;

  return (
    <div className="modal-overlay" onClick={isDeleting ? undefined : onCancel} id="delete-modal-overlay">
      <div
        className="modal-card modal-card--danger"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        id="delete-modal"
      >
        <div className="modal-card__header">
          <div className="modal-card__icon modal-card__icon--danger">
            <AlertCircleIcon size={24} />
          </div>
          <div>
            <h3 className="modal-card__title" id="delete-modal-title">Delete Event</h3>
            <p className="modal-card__subtitle">Confirm destructive action</p>
          </div>
        </div>

        <div className="modal-card__body">
          <p>
            Are you sure you want to delete <strong>&ldquo;{event.title}&rdquo;</strong>?
          </p>
          <p className="modal-card__warning">
            This action cannot be undone and will permanently remove this event from the CampusPulse platform.
          </p>
        </div>

        <div className="modal-card__actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onCancel}
            disabled={isDeleting}
            id="delete-modal-cancel-btn"
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={onConfirm}
            disabled={isDeleting}
            id="delete-modal-confirm-btn"
          >
            {isDeleting ? (
              <>
                <SpinnerIcon size={16} />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <TrashIcon size={16} />
                <span>Delete Event</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
