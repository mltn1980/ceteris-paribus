import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { LogIn, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function LoginModal({ open, onClose }: LoginModalProps) {
  const { refresh } = useAuth();
  const [loading, setLoading] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const handleLogin = useCallback(() => {
    const url = getLoginUrl();
    const width = 480;
    const height = 600;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;

    const popup = window.open(
      url,
      "cp-login",
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      // Fallback if popup blocked
      window.location.href = url;
      return;
    }

    popupRef.current = popup;
    setLoading(true);

    // Poll until popup closes, then refresh auth state
    pollRef.current = setInterval(async () => {
      if (!popupRef.current || popupRef.current.closed) {
        stopPolling();
        setLoading(false);
        await refresh();
        onClose();
      }
    }, 500);
  }, [refresh, onClose, stopPolling]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm mx-4 rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "oklch(0.13 0.02 250)" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[oklch(0.55_0.02_250)] hover:text-[oklch(0.85_0.01_250)] hover:bg-[oklch(0.20_0.02_250)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-8 pt-10 pb-8 flex flex-col items-center gap-6">
          {/* Logo */}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[oklch(0.72_0.19_165)] to-[oklch(0.65_0.16_195)] flex items-center justify-center shadow-[0_0_24px_oklch(0.72_0.19_165/0.4)]">
            <span className="text-base font-black text-[oklch(0.13_0.02_250)]">CP</span>
          </div>

          {/* Title */}
          <div className="text-center">
            <h2 className="text-xl font-bold text-[oklch(0.92_0.01_250)] mb-1.5">
              Ingresá a Ceteris Paribus
            </h2>
            <p className="text-sm text-[oklch(0.55_0.02_250)]">
              Accedé a informes y análisis del agro uruguayo
            </p>
          </div>

          {/* Login button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-[oklch(0.72_0.19_165)] to-[oklch(0.65_0.16_195)] text-[oklch(0.13_0.02_250)] hover:shadow-[0_0_28px_oklch(0.72_0.19_165/0.5)] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-[oklch(0.13_0.02_250)/0.3] border-t-[oklch(0.13_0.02_250)] animate-spin" />
                Esperando...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Continuar
              </>
            )}
          </button>

          <p className="text-xs text-center text-[oklch(0.45_0.02_250)] leading-relaxed">
            Al continuar aceptás los{" "}
            <a href="/terms" onClick={onClose} className="text-[oklch(0.60_0.08_165)] hover:underline">
              Términos de uso
            </a>{" "}
            y la{" "}
            <a href="/privacy" onClick={onClose} className="text-[oklch(0.60_0.08_165)] hover:underline">
              Política de privacidad
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
