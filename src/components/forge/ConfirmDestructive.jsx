import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

export function ConfirmDestructive({
  open, onClose, onConfirm, loading,
  title = 'Are you sure?', body,
  confirmLabel = 'Delete', cancelLabel = 'Cancel',
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
           footer={
             <>
               <Button onClick={onClose} disabled={loading}>{cancelLabel}</Button>
               <Button variant="danger" onClick={onConfirm} loading={loading}
                       icon={AlertTriangle}>{confirmLabel}</Button>
             </>
           }>
      <p className="text-sm text-ink-2">{body ?? 'This action cannot be undone.'}</p>
    </Modal>
  );
}
