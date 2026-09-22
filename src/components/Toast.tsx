import { AnimatePresence, motion } from 'motion/react';
import { useToast } from '../viewmodels/toast';
import { spring } from './motion';
import './Toast.css';

export function ToastHost() {
  const toast = useToast();
  return (
    <div className="toast-host" role="status" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className="toast glass glass--strong"
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={spring}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
