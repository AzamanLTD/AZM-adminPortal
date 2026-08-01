import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { toastV, spring } from '@/lib/motion';
import { X, Check, AlertTriangle, Info } from 'lucide-react';

const ToastCtx = createContext(null);
let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const remove = useCallback(id => {
    setToasts(t => t.filter(x => x.id !== id));
    const tmr = timers.current.get(id);
    if (tmr) { clearTimeout(tmr); timers.current.delete(id); }
  }, []);

  const push = useCallback((variant, title, opts = {}) => {
    const id = ++_id;
    setToasts(t => [...t, { id, variant, title, ...opts }]);
    const dur = opts.duration ?? (variant === 'error' ? 6000 : 4000);
    if (dur > 0) {
      const tmr = setTimeout(() => remove(id), dur);
      timers.current.set(id, tmr);
    }
    return id;
  }, [remove]);

  const api = {
    success: (t, o) => push('success', t, o),
    error:   (t, o) => push('error', t, o),
    info:    (t, o) => push('info', t, o),
    remove,
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {createPortal(
        <div className="f-toast-stack" aria-live="polite" aria-atomic="false">
          <AnimatePresence>
            {toasts.map(t => (
              <motion.div key={t.id} layout
                variants={toastV} initial="initial" animate="animate" exit="exit"
                transition={spring.toast}
                className={`f-toast f-toast--${t.variant}`}>
                <div className="f-toast__icon">
                  {t.variant === 'success' && <Check className="h-4 w-4" />}
                  {t.variant === 'error' && <AlertTriangle className="h-4 w-4" />}
                  {t.variant === 'info' && <Info className="h-4 w-4" />}
                </div>
                <div className="f-toast__body">
                  <div className="f-toast__title">{t.title}</div>
                  {t.description && <div className="f-toast__desc">{t.description}</div>}
                  {t.undo && (
                    <button className="f-toast__undo"
                            onClick={() => { t.undo(); remove(t.id); }}>
                      Undo
                    </button>
                  )}
                </div>
                <button className="f-toast__close" onClick={() => remove(t.id)} aria-label="Dismiss">
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body)}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

// imperative escape hatch for non-component code
let _api = null;
export function bindToastApi(api) { _api = api; }
export function notify(variant, title, opts) { _api?.[variant](title, opts); }
