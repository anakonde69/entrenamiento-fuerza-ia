import { AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ isOpen, message, onConfirm, onCancel }: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl w-full max-w-sm shadow-2xl shadow-black overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="w-12 h-12 bg-red-600/10 rounded-full flex items-center justify-center mb-4 mx-auto border border-red-600/30">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="text-lg font-black text-white text-center mb-2 uppercase tracking-wide">Confirmar Acción</h3>
          <p className="text-zinc-400 text-sm text-center">{message}</p>
        </div>
        <div className="flex border-t border-zinc-900">
          <button
            onClick={onCancel}
            className="flex-1 py-4 text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors uppercase tracking-wider cursor-pointer"
          >
            Cancelar
          </button>
          <div className="w-px bg-zinc-900" />
          <button
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className="flex-1 py-4 text-xs font-black text-red-500 hover:text-white hover:bg-red-600 transition-colors uppercase tracking-wider cursor-pointer"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
