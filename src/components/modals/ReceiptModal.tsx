import React from 'react';
import { X, Printer, Building2, CheckCircle2, ShieldCheck, Download } from 'lucide-react';
import { Payment, CompanySettings } from '../../types';
import { formatCurrency } from '../../lib/db';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment;
  settings: CompanySettings;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  payment,
  settings,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const res = payment.reservation;
  const prop = res?.property;
  const unit = res?.unit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-purple-100 flex flex-col max-h-[90vh]">
        {/* Modal Controls (Not printed) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:hidden">
          <span className="text-xs font-bold text-slate-700">Official Payment Receipt</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2A0845] text-white text-xs font-semibold hover:bg-[#3D105E] transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Receipt Document */}
        <div className="p-8 overflow-y-auto space-y-6 text-slate-800 bg-white" id="printable-receipt">
          {/* Letterhead */}
          <div className="flex items-start justify-between border-b-2 border-[#2A0845] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#2A0845] flex items-center justify-center text-[#D4AF37]">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-sm text-[#2A0845]">{settings.company_name}</h2>
                  <p className="text-[9px] font-bold text-[#D4AF37] uppercase tracking-wider">{settings.brand_name}</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 italic">"{settings.motto}"</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{settings.address}</p>
              <p className="text-[10px] text-slate-500">Tel: {settings.phone} | {settings.email}</p>
            </div>

            <div className="text-right">
              <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                {payment.status}
              </span>
              <p className="font-mono text-xs font-bold text-slate-700 mt-2">
                REF: {payment.transaction_ref}
              </p>
              <p className="text-[10px] text-slate-400">
                Date: {new Date(payment.created_at || Date.now()).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Customer & Reservation Info */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Issued To
              </span>
              <p className="font-bold text-slate-900 mt-0.5">{res?.customer_name || 'Customer'}</p>
              <p className="text-slate-600 text-[11px]">{res?.customer_email}</p>
              <p className="text-slate-600 text-[11px]">{res?.customer_phone}</p>
            </div>

            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Reservation Reference
              </span>
              <p className="font-mono font-bold text-[#2A0845] mt-0.5">{res?.reference_no || 'N/A'}</p>
              <p className="text-slate-600 text-[11px] capitalize">Channel: {payment.payment_method.replace('_', ' ')}</p>
              {payment.bank_transaction_id && (
                <p className="text-slate-500 text-[10px]">Bank Ref: {payment.bank_transaction_id}</p>
              )}
            </div>
          </div>

          {/* Property Breakdown Item */}
          <div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-300 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">
                  <th className="py-2">Description</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3">
                    <p className="font-bold text-slate-800">{prop?.title || 'Property Reservation'}</p>
                    <p className="text-[10px] text-slate-500">
                      {unit?.unit_name ? `Unit / Room: ${unit.unit_name} • ` : ''}
                      Property Ref: {prop?.reference_no}
                    </p>
                    {res?.start_date && (
                      <p className="text-[10px] text-slate-500">
                        Tenancy Period: {res.start_date} {res.end_date ? `to ${res.end_date}` : ''}
                      </p>
                    )}
                  </td>
                  <td className="py-3 text-right font-bold text-slate-900">
                    {formatCurrency(payment.amount, payment.currency)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 text-sm font-extrabold text-[#2A0845]">
                  <td className="py-3">Total Amount Paid</td>
                  <td className="py-3 text-right">
                    {formatCurrency(payment.amount, payment.currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Verification & Stamp */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="font-bold text-slate-800">Verified & Authenticated</p>
                <p>Official record generated by ADIBEX PRESTIGE ENTERPRISE billing server.</p>
              </div>
            </div>
            <div className="text-right font-mono text-[9px] text-slate-400">
              AUTHO-TOKEN-{payment.id?.substring(0, 8).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
