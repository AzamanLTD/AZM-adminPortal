import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { modalV, scrimV } from '@/lib/motion';
import { KeyScope } from '@/lib/keys';
import { cn } from '@/lib/utils';

export function Modal({ open, onClose, title, description, children,
                        footer, size = 'md', closeOnOverlay = true }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="f-scrim" variants={scrimV}
            initial="initial" animate="animate" exit="exit"
            onClick={closeOnOverlay ? onClose : undefined} />
          <div className="f-modal-root">
            <KeyScope id="modal">
              <motion.div className={cn('f-modal', `f-modal--${size}`)}
                variants={modalV} initial="initial" animate="animate" exit="exit"
                role="dialog" aria-modal="true" aria-label={title}>
                <header className="f-modal__head">
                  <div>
                    <h3 className="f-modal__title">{title}</h3>
                    {description && <p className="f-modal__desc">{description}</p>}
                  </div>
                  <button className="f-icon-btn" onClick={onClose} aria-label="Close">
                    <X className="h-4 w-4" />
                  </button>
                </header>
                <div className="f-modal__body">{children}</div>
                {footer && <footer className="f-modal__foot">{footer}</footer>}
              </motion.div>
            </KeyScope>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
