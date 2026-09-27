import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Download, FileText, AlertTriangle, Loader2 } from 'lucide-react';
import { Payment } from '../../types';
import { isDurableMediaUrl, isPaymentProofPath } from '../../lib/media';
import { getPaymentProofUrl } from '../../lib/db';

interface PaymentProofModalProps {
  payment: Payment | null;
  onClose: () => void;
}

/**
 * In-app viewer for payment proofs.
 *
 * Browsers block top-frame navigation to `data:` URLs, so a plain
 * <a target="_blank"> does nothing when a proof was stored inline. This modal
 * renders the proof inside the app instead:
 * - absolute http(s) URLs → <img>/<iframe> directly, with Open/Download
 * - inline data: URLs → rendered in-page (never a new tab)
 * - Storage object paths ("payment-proofs/…") → mint a short-lived signed URL
 *   for the private bucket at open time, then render like any other URL
 * - dead references (legacy blob:) → clear "re-upload" message
 */
export const PaymentProofModal: React.FC<PaymentProofModalProps> = ({ payment, onClose }) => {
  const resolved = useResolvedProofUrl(payment?.payment_proof_url ?? null);
  const resolvedUrl = resolved.url;

  if (!payment) return null;
  const proofUrl = payment.payment_proof_url || null;
  const transactionRef = payment.transaction_ref;
  if (!proofUrl) return null;

  const lowerUrl = (resolvedUrl || proofUrl).toLowerCase();
  const isPath = isPaymentProofPath(proofUrl);
  const isPdf = lowerUrl.startsWith('data:application/pdf') || lowerUrl.endsWith('.pdf');
  const isImage = lowerUrl.startsWith('data:image/') || lowerUrl.startsWith('http');
  const canOpenExternally = !!resolvedUrl && !lowerUrl.startsWith('data:');

  const customer = payment.reservation?.customer_name || 'Customer';
  const propertyTitle = payment.reservation?.property?.title || 'Reservation';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-purple-100 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-[#2A0845] to-[#3D105E] text-white flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">Payment Proof</p>
            <p className="font-mono font-bold text-sm truncate">{transactionRef}</p>
            <p className="text-[11px] text-purple-200 truncate">
              {customer} &middot; {propertyTitle}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            {canOpenExternally && (
              <>
                <a
                  href={resolvedUrl as string}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-[11px] font-semibold hover:bg-white/20 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open
                </a>
                <a
                  href={resolvedUrl as string}
                  download={`proof-${transactionRef}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-[11px] font-semibold hover:bg-white/20 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </a>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close proof viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto bg-slate-100 p-4">
          {isPath && !resolvedUrl ? (
            resolved.error ? (
              <LoadError message={resolved.error} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                <p className="text-xs font-semibold text-slate-500 mt-3">Unlocking secure proof&hellip;</p>
              </div>
            )
          ) : !isDurableMediaUrl(resolvedUrl || proofUrl) ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-12">
              <AlertTriangle className="w-10 h-10 text-amber-400" />
              <p className="font-bold text-slate-800 text-sm mt-3">This proof is no longer viewable</p>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                It was stored as a temporary browser URL that expired. Ask the customer to re-upload.
              </p>
            </div>
          ) : isPdf ? (
            <iframe
              src={resolvedUrl || proofUrl}
              title={`Payment proof ${transactionRef}`}
              className="w-full h-[65vh] rounded-xl bg-white border border-slate-200"
            />
          ) : isImage ? (
            <img
              src={resolvedUrl || proofUrl}
              alt={`Payment proof ${transactionRef}`}
              className="max-w-full max-h-[65vh] mx-auto rounded-xl shadow-md object-contain"
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-12">
              <FileText className="w-10 h-10 text-slate-300" />
              <p className="font-bold text-slate-800 text-sm mt-3">Proof stored as a file</p>
              <p className="text-xs text-slate-500 mt-1">Use Open or Download above to view it.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const LoadError: React.FC<{ message: string }> = ({ message }) => (
  <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-12">
    <AlertTriangle className="w-10 h-10 text-rose-400" />
    <p className="font-bold text-slate-800 text-sm mt-3">Could not open the secure proof</p>
    <p className="text-xs text-slate-500 max-w-sm mt-1">{message}</p>
  </div>
);

/** Mints a signed URL for Storage paths; passes everything else through. */
function useResolvedProofUrl(raw: string | null): { url: string | null; error?: string } {
  const needsSigning = !!raw && isPaymentProofPath(raw);
  const [state, setState] = useState<{ url: string | null; error?: string }>({ url: needsSigning ? null : raw });

  useEffect(() => {
    if (!raw) {
      setState({ url: null });
      return;
    }
    if (!needsSigning) {
      setState({ url: raw });
      return;
    }
    let active = true;
    setState({ url: null });
    getPaymentProofUrl({ payment_proof_url: raw })
      .then((url) => {
        if (active) setState(url ? { url } : { url: null, error: 'The signed link expired or the file is missing from storage. Try again, or ask the customer to re-upload.' });
      })
      .catch(() => {
        if (active) setState({ url: null, error: 'Failed to reach secure storage. Check your connection and try again.' });
      });
    return () => {
      active = false;
    };
  }, [raw, needsSigning]);

  return state;
}
