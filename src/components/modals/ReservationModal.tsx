import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Building,
  CheckCircle2,
  Clock,
  Upload,
  AlertCircle,
  FileText,
  Shield,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Property, PropertyUnit, UserProfile, CurrencyCode, CompanySettings, Reservation } from '../../types';
import { formatCurrency, createReservation, submitPayment, uploadMediaFile } from '../../lib/db';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
  selectedUnit?: PropertyUnit | null;
  userProfile?: UserProfile | null;
  settings: CompanySettings;
  currency: CurrencyCode;
  onSuccess?: (reservation: Reservation) => void;
}

export const ReservationModal: React.FC<ReservationModalProps> = ({
  isOpen,
  onClose,
  property,
  selectedUnit: initialUnit,
  userProfile,
  settings,
  currency,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [unit, setUnit] = useState<PropertyUnit | null>(initialUnit || null);
  const [customerName, setCustomerName] = useState(userProfile?.full_name || '');
  const [customerEmail, setCustomerEmail] = useState(userProfile?.email || '');
  const [customerPhone, setCustomerPhone] = useState(userProfile?.phone || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');

  // Payment choice
  const [paymentMethod, setPaymentMethod] = useState<'PAYSTACK_CARD' | 'MOBILE_MONEY' | 'BANK_TRANSFER'>('MOBILE_MONEY');
  const [momoProvider, setMomoProvider] = useState<'MTN' | 'Telecel'>('MTN');
  const [momoNumber, setMomoNumber] = useState(userProfile?.phone || '');
  const [bankTxnId, setBankTxnId] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedReservation, setCompletedReservation] = useState<Reservation | null>(null);

  // Expiration countdown
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  useEffect(() => {
    if (initialUnit) setUnit(initialUnit);
  }, [initialUnit]);

  useEffect(() => {
    if (isOpen) {
      setTimeLeft(settings.reservation_expiry_minutes * 60);
      const timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isOpen, settings.reservation_expiry_minutes]);

  if (!isOpen) return null;

  const availableUnits = property.units?.filter((u) => u.status === 'AVAILABLE') || [];
  const basePrice = unit ? unit.price : property.price;
  const baseCurrency = unit ? unit.currency : property.currency;

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  const handleStep1Next = () => {
    if (property.units && property.units.length > 0 && !unit) {
      setError('Please select an available unit or room to proceed.');
      return;
    }
    setError(null);
    setCurrentStep(2);
  };

  const handleStep2Next = () => {
    if (!userProfile?.id) {
      setError('Please sign in or register with your account before completing a reservation.');
      return;
    }
    if (!customerName || !customerEmail || !customerPhone) {
      setError('Please provide all required contact details.');
      return;
    }
    setError(null);
    setCurrentStep(3);
  };

  const handleCompleteReservation = async () => {
    if (!userProfile?.id) {
      setError('Authentication required. Please sign in to confirm your reservation.');
      return;
    }
    setError(null);
    setIsProcessing(true);

    try {
      // 1. Create reservation in Supabase with availability check
      const res = await createReservation({
        property_id: property.id,
        unit_id: unit?.id || null,
        customer_id: userProfile.id,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        total_amount: basePrice,
        currency: baseCurrency,
        start_date: startDate || null,
        end_date: endDate || null,
        notes,
        expiry_minutes: settings.reservation_expiry_minutes,
      });

      if (!res.success || !res.data) {
        setError(res.error || 'Failed to lock reservation. Unit may already be booked.');
        setIsProcessing(false);
        return;
      }

      const reservationRecord = res.data;

      // 2. Upload proof if manual bank or direct MoMo
      let proofUrl: string | null = null;
      if (proofFile) {
        const uploadRes = await uploadMediaFile(proofFile, 'payment-proofs');
        proofUrl = uploadRes.url;
      }

      // 3. Record payment
      const paymentRes = await submitPayment({
        reservation_id: reservationRecord.id,
        customer_id: userProfile.id,
        amount: basePrice,
        currency: baseCurrency,
        payment_method: paymentMethod,
        payment_proof_url: proofUrl,
        bank_transaction_id: bankTxnId || null,
      });

      if (!paymentRes.success) {
        setError('Reservation recorded, but payment recording failed. Please view your reservation in your portal.');
      }

      setCompletedReservation(reservationRecord);
      setCurrentStep(4);
      if (onSuccess) onSuccess(reservationRecord);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during reservation processing.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-purple-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-[#2A0845] to-[#3D105E] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37]">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[#D4AF37] font-bold text-[10px] tracking-wider uppercase">
                  Reservation System
                </span>
                <span className="flex items-center gap-1 text-[11px] bg-white/10 px-2 py-0.5 rounded-full text-purple-200">
                  <Clock className="w-3 h-3 text-[#D4AF37]" />
                  Window: {formatCountdown(timeLeft)}
                </span>
              </div>
              <h3 className="font-bold text-base text-white truncate max-w-sm">{property.title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="grid grid-cols-4 border-b border-slate-100 bg-slate-50 text-[11px] font-semibold text-center">
          <div className={`py-2.5 ${currentStep >= 1 ? 'text-[#2A0845] border-b-2 border-[#2A0845] bg-white' : 'text-slate-400'}`}>
            1. Unit & Pricing
          </div>
          <div className={`py-2.5 ${currentStep >= 2 ? 'text-[#2A0845] border-b-2 border-[#2A0845] bg-white' : 'text-slate-400'}`}>
            2. Customer Info
          </div>
          <div className={`py-2.5 ${currentStep >= 3 ? 'text-[#2A0845] border-b-2 border-[#2A0845] bg-white' : 'text-slate-400'}`}>
            3. Payment
          </div>
          <div className={`py-2.5 ${currentStep === 4 ? 'text-emerald-700 border-b-2 border-emerald-600 bg-white' : 'text-slate-400'}`}>
            4. Confirmation
          </div>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-700 text-xs">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Unit & Pricing */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-medium text-slate-500">Property Reference</span>
                  <p className="font-mono font-bold text-sm text-[#2A0845]">{property.reference_no}</p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-medium text-slate-500">Listed Price</span>
                  <p className="font-bold text-base text-[#2A0845]">
                    {formatCurrency(property.price, currency, property.currency)}
                    {property.transaction_type === 'RENT' && property.rental_frequency && (
                      <span className="text-xs font-normal text-slate-500"> / {property.rental_frequency}</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Units Selection if Multi-Unit */}
              {property.units && property.units.length > 0 ? (
                <div>
                  <label className="block font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#D4AF37]" />
                    Select Unit / Room to Reserve:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-1">
                    {property.units.map((u) => {
                      const isAvail = u.status === 'AVAILABLE';
                      const isSelected = unit?.id === u.id;
                      return (
                        <div
                          key={u.id}
                          onClick={() => isAvail && setUnit(u)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            !isAvail
                              ? 'opacity-50 bg-slate-100 border-slate-200 cursor-not-allowed'
                              : isSelected
                              ? 'border-[#2A0845] bg-[#2A0845]/5 ring-1 ring-[#2A0845]'
                              : 'border-slate-200 hover:border-purple-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">{u.unit_name}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isAvail ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {u.status}
                            </span>
                          </div>
                          <p className="font-bold text-xs text-purple-900 mt-1">
                            {formatCurrency(u.price, currency, u.currency)}
                          </p>
                          {u.floor_level && (
                            <p className="text-[10px] text-slate-400 mt-0.5">Floor: {u.floor_level}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 leading-relaxed">
                  You are reserving this entire property directly. Once confirmed, this property will be locked under your name.
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#2A0845]/20 focus:border-[#2A0845]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End / Lease Duration</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#2A0845]/20 focus:border-[#2A0845]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Customer Contact Info */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Kwame Asante"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#2A0845]/20 focus:border-[#2A0845]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="kwame@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#2A0845]/20 focus:border-[#2A0845]"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Official reservation confirmation and receipt will be sent here.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number (Mobile Money / WhatsApp) *</label>
                <input
                  type="tel"
                  required
                  placeholder="+233 24 000 0000"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#2A0845]/20 focus:border-[#2A0845]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Special Remarks / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Any special move-in date adjustments or payment instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#2A0845]/20 focus:border-[#2A0845]"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Payment Method */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500">Total Due for Reservation</span>
                  <p className="font-bold text-base text-[#2A0845]">
                    {formatCurrency(basePrice, currency, baseCurrency)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-200 font-semibold">
                    100% Secured
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-2">Choose Payment Channel:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('MOBILE_MONEY')}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      paymentMethod === 'MOBILE_MONEY'
                        ? 'border-[#2A0845] bg-[#2A0845] text-white shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 mx-auto mb-1 text-[#D4AF37]" />
                    <span className="font-bold text-[11px] block">Mobile Money</span>
                    <span className="text-[9px] opacity-80">MTN / Telecel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('PAYSTACK_CARD')}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      paymentMethod === 'PAYSTACK_CARD'
                        ? 'border-[#2A0845] bg-[#2A0845] text-white shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 mx-auto mb-1 text-[#D4AF37]" />
                    <span className="font-bold text-[11px] block">Debit / Card</span>
                    <span className="text-[9px] opacity-80">Visa / Mastercard</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('BANK_TRANSFER')}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      paymentMethod === 'BANK_TRANSFER'
                        ? 'border-[#2A0845] bg-[#2A0845] text-white shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Building className="w-5 h-5 mx-auto mb-1 text-[#D4AF37]" />
                    <span className="font-bold text-[11px] block">Bank Transfer</span>
                    <span className="text-[9px] opacity-80">GCB Bank</span>
                  </button>
                </div>
              </div>

              {/* Channel specific instructions */}
              {paymentMethod === 'BANK_TRANSFER' && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-[#D4AF37]" />
                    Adibex Prestige Official Bank Details:
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                    <div>
                      <span className="text-slate-400">Bank:</span>
                      <p className="font-bold">{settings.bank_name}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Account Name:</span>
                      <p className="font-bold">{settings.bank_account_name}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Account Number:</span>
                      <p className="font-mono font-bold text-purple-900">{settings.bank_account_number}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Branch:</span>
                      <p className="font-bold">{settings.bank_branch}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <label className="block font-semibold text-slate-700">Bank Transaction ID / Slip Ref *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. GCB-TXN-987654"
                      value={bankTxnId}
                      onChange={(e) => setBankTxnId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                    />

                    <label className="block font-semibold text-slate-700">Upload Deposit Proof / Screenshot</label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-100 file:text-[#2A0845] hover:file:bg-purple-200"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'MOBILE_MONEY' && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                    Mobile Money Payment (Ghana):
                  </h4>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-[11px] space-y-1">
                    <p>Network: <strong className="text-slate-800">{settings.momo_network}</strong></p>
                    <p>Merchant Number: <strong className="text-purple-900 font-mono text-xs">{settings.momo_number}</strong></p>
                    <p>Account Name: <strong className="text-slate-800">{settings.momo_account_name}</strong></p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Your MoMo Number</label>
                      <input
                        type="tel"
                        placeholder="024XXXXXXX"
                        value={momoNumber}
                        onChange={(e) => setMomoNumber(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">MoMo Transaction ID</label>
                      <input
                        type="text"
                        placeholder="e.g. 192837465"
                        value={bankTxnId}
                        onChange={(e) => setBankTxnId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Upload MoMo SMS Screenshot / Receipt</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-100 file:text-[#2A0845] hover:file:bg-purple-200"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'PAYSTACK_CARD' && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-[11px]">
                  <p className="font-semibold text-slate-800">Secure Online Card Checkout</p>
                  <p className="text-slate-600">
                    Supports all Visa, Mastercard, and Verve debit cards worldwide. Payments are securely processed through Paystack end-to-end encrypted infrastructure.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Confirmation */}
          {currentStep === 4 && completedReservation && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="font-extrabold text-xl text-[#2A0845]">Reservation Successfully Created!</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                Your reservation reference code is:
              </p>
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 max-w-xs mx-auto">
                <span className="font-mono font-extrabold text-lg text-[#2A0845]">
                  {completedReservation.reference_no}
                </span>
                <p className="text-[10px] text-purple-700 mt-0.5">Status: {completedReservation.status}</p>
              </div>

              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'MOBILE_MONEY'
                  ? 'Our accounting team is verifying your payment submission. Once approved, you will receive an instant confirmation.'
                  : 'Your payment was processed successfully and the unit is now reserved.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          {currentStep > 1 && currentStep < 4 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {currentStep === 1 && (
            <button
              type="button"
              onClick={handleStep1Next}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#2A0845] text-white text-xs font-bold hover:bg-[#3D105E] transition-all shadow-md shadow-purple-950/15 cursor-pointer ml-auto"
            >
              <span>Continue to Contact</span>
              <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
            </button>
          )}

          {currentStep === 2 && (
            <button
              type="button"
              onClick={handleStep2Next}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#2A0845] text-white text-xs font-bold hover:bg-[#3D105E] transition-all shadow-md shadow-purple-950/15 cursor-pointer"
            >
              <span>Proceed to Payment</span>
              <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
            </button>
          )}

          {currentStep === 3 && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleCompleteReservation}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#2A0845] text-white text-xs font-bold hover:bg-[#3D105E] transition-all shadow-md shadow-purple-950/15 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? 'Confirming Reservation...' : 'Complete & Lock Reservation'}
            </button>
          )}

          {currentStep === 4 && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-[#2A0845] text-white text-xs font-bold hover:bg-[#3D105E] transition-all cursor-pointer"
            >
              Done & Return to Property
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
