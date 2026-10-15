import React, { useRef } from 'react';
import { BookingRecord } from '../types';
import { VillaLogo } from './VillaLogo';
import { 
  Printer, 
  X, 
  CheckCircle2, 
  Sparkles
} from 'lucide-react';

interface VoucherModalProps {
  booking: BookingRecord | null;
  onClose: () => void;
}

export const VoucherModal: React.FC<VoucherModalProps> = ({ booking, onClose }) => {
  const voucherCardRef = useRef<HTMLDivElement>(null);

  if (!booking) return null;

  // Print voucher (80mm thermal receipt format)
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      
      {/* Container Card sized for thermal 80mm receipt style */}
      <div className="bg-[#FAF7F2] rounded-2xl max-w-[420px] w-full max-h-[95vh] overflow-y-auto border-2 border-[#E6D7C3] shadow-2xl relative flex flex-col my-auto font-mono text-xs">
        
        {/* Modal Top Bar (Hidden in Print) */}
        <div className="no-print bg-[#1F140C] text-white p-3 px-4 rounded-t-2xl flex items-center justify-between border-b border-[#D4AF37]/30 sticky top-0 z-20 shadow-md">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#E5C158]" />
            <span className="font-serif font-bold text-xs text-[#FFF2CC]">
              Thermal Voucher Receipt
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#997A15] hover:from-[#A67908] hover:to-[#B8860B] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer border border-white/20 active:scale-95"
              title="Print voucher on thermal printer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-[#E6D7C3] hover:text-white transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable / Thermal Voucher Body */}
        <div 
          id="printable-voucher"
          ref={voucherCardRef}
          className="p-4 sm:p-5 space-y-4 printable-card text-[#2C1E15] bg-[#FAF7F2]"
        >
          
          {/* Voucher Header — Matching Header Logo & Description */}
          <div className="text-center border-b border-dashed border-[#2C1E15]/40 pb-3 space-y-2 flex flex-col items-center">
            <div className="flex items-center justify-center gap-3">
              <VillaLogo size={52} variant="gold" />
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-2">
                  <span
                    style={{ fontSize: "19px" }}
                    className="font-brand font-black text-transparent bg-clip-text bg-gradient-to-r from-[#2C1E15] via-[#785423] to-[#B8860B] tracking-[0.14em] uppercase"
                  >
                    Diversion Vigan
                  </span>
                  <span
                    style={{ fontSize: "11px" }}
                    className="bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-widest font-monogram shadow-2xs"
                  >
                    Ilocos Sur
                  </span>
                </div>
                <span
                  style={{ fontStyle: "normal" }}
                  className="text-xs font-serif tracking-[0.2em] text-[#8B6B10] font-bold"
                >
                  Transient &amp; Private Villa
                </span>
              </div>
            </div>
            <div className="text-[9.5px] text-[#6E5544] space-y-0.5 font-sans">
              <p>24/7 Front Gate: Diversion Road, Brgy CabalangeGan, Vigan City</p>
              <p>Hotline: +63 917 890 1234 • 5-8 Mins from Calle Crisologo &amp; Plaza Salcedo</p>
            </div>
          </div>

          {/* Reference & Issue Date */}
          <div className="bg-[#1F140C] text-white p-2.5 rounded-xl text-center border border-[#D4AF37]/40 shadow-sm">
            <span className="text-[9px] uppercase tracking-widest text-[#E5C158] font-bold block">
              Official Booking Reference
            </span>
            <span className="font-mono font-bold text-sm text-[#FFF2CC] block mt-0.5">
              {booking.id}
            </span>
            <span className="text-[9px] text-[#E5C158]/80 block mt-0.5">
              Issued: {new Date(booking.createdAt).toLocaleDateString()}
            </span>
          </div>

          {/* Status Banner */}
          {booking.status === 'Cancelled' ? (
            <div className="p-2.5 bg-rose-100 rounded-xl border border-rose-400 text-center space-y-0.5">
              <span className="text-[11px] font-black text-rose-900 uppercase block">
                RESERVATION VOIDED / CANCELLED
              </span>
              <p className="text-[10px] text-rose-800">
                This voucher is invalid for check-in.
              </p>
            </div>
          ) : (
            <div className="p-2 bg-emerald-800 text-white rounded-xl text-center text-[11px] font-bold uppercase tracking-wide border border-emerald-600">
              STATUS: {booking.status}
            </div>
          )}

          {/* Guest Information */}
          <div className="p-3 rounded-xl bg-white border border-[#E6D7C3] space-y-1.5 text-[11px]">
            <div className="text-[9px] uppercase font-bold text-[#8B6B10] border-b border-[#E6D7C3]/50 pb-1">
              Guest Details
            </div>
            <div className="flex justify-between">
              <span className="text-[#6E5544]">Name:</span>
              <strong className="text-[#2C1E15] text-right truncate max-w-[180px]">{booking.guestName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6E5544]">Phone:</span>
              <span className="font-mono">{booking.guestPhone}</span>
            </div>
            {booking.guestEmail && (
              <div className="flex justify-between">
                <span className="text-[#6E5544]">Email:</span>
                <span className="truncate max-w-[170px]">{booking.guestEmail}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 border-t border-[#E6D7C3]/50">
              <span className="text-[#6E5544]">Headcount:</span>
              <span>{booking.adultGuests} Adult{booking.adultGuests > 1 ? 's' : ''} {booking.childGuests ? `, ${booking.childGuests} Kids` : ''}</span>
            </div>
          </div>

          {/* Accommodation Schedule */}
          <div className="p-3 rounded-xl bg-white border border-[#E6D7C3] space-y-1.5 text-[11px]">
            <div className="text-[9px] uppercase font-bold text-[#8B6B10] border-b border-[#E6D7C3]/50 pb-1">
              Accommodation Schedule
            </div>
            <div className="flex justify-between">
              <span className="text-[#6E5544]">Unit:</span>
              <strong className="text-[#2C1E15] text-right truncate max-w-[170px]">{booking.roomTitle}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6E5544]">Type:</span>
              <span className="font-semibold uppercase">{booking.stayType === 'nightly' ? 'Nightly Stay' : 'Hourly / Short'}</span>
            </div>

            {booking.stayType === 'nightly' ? (
              <>
                <div className="flex justify-between">
                  <span className="text-[#6E5544]">Check-In:</span>
                  <strong>{booking.checkInDate} (2PM)</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E5544]">Check-Out:</span>
                  <strong>{booking.checkOutDate} (12NN)</strong>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#E6D7C3]/50">
                  <span className="text-[#6E5544]">Nights:</span>
                  <strong className="text-amber-900">{booking.numberOfNights} Night(s)</strong>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-[#6E5544]">Date:</span>
                  <strong>{booking.hourlyDate}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E5544]">Time / Block:</span>
                  <strong>{booking.hourlyStartTime} ({booking.hourlyDurationHours}h)</strong>
                </div>
              </>
            )}
          </div>

          {/* Add-ons if any */}
          {booking.addons && booking.addons.length > 0 && (
            <div className="p-3 rounded-xl bg-white border border-[#E6D7C3] space-y-1 text-[11px]">
              <div className="text-[9px] uppercase font-bold text-[#8B6B10] border-b border-[#E6D7C3]/50 pb-1">
                Add-Ons
              </div>
              {booking.addons.map((a, i) => (
                <div key={i} className="flex justify-between text-[10px]">
                  <span>{a.name} (x{a.quantity})</span>
                  <span>₱{a.cost.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {/* Financial Statement */}
          <div className="p-3 rounded-xl bg-[#1F140C] text-white space-y-2 border border-[#D4AF37]/50">
            <div className="text-[9px] text-[#E5C158] uppercase tracking-wider border-b border-white/10 pb-1 text-center font-bold">
              Ledger Settlement
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-[#E6D7C3]">Grand Total:</span>
                <strong className="text-[#FFF2CC] text-sm">₱{booking.grandTotal.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#E6D7C3]">Paid Deposit:</span>
                <strong className="text-emerald-400">₱{booking.amountPaidNow.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between pt-1 border-t border-white/10">
                <span className="text-[#E5C158] font-bold">Balance Due:</span>
                <strong className="text-[#E5C158] text-sm">₱{booking.remainingBalance.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between text-[10px] text-[#E6D7C3]/80 pt-0.5">
                <span>Payment Mode:</span>
                <span className="uppercase">{booking.paymentMethod}</span>
              </div>
            </div>
          </div>

          {/* Short Policies */}
          <div className="text-[9px] text-[#6E5544] bg-white p-3 rounded-xl border border-[#E6D7C3] space-y-1">
            <span className="font-bold text-[#2C1E15] uppercase block">Policies:</span>
            <p>Present ID upon arrival. Check-in 2:00 PM / Check-out 12:00 PM. Settle balance upon key handover.</p>
          </div>

          {/* Footer Stamp */}
          <div className="pt-2 border-t border-dashed border-[#2C1E15]/40 text-center text-[9px] text-[#7A604D]">
            <p>Diversion Vigan — Official Thermal Receipt</p>
            <p className="font-mono mt-0.5">Ref: {booking.id}</p>
          </div>

        </div>

        {/* Modal Bottom Bar (Hidden in Print) */}
        <div className="no-print bg-[#FAF7F2] border-t border-[#E6D7C3] p-3 px-4 rounded-b-2xl flex items-center justify-between">
          <span className="text-[10px] text-[#7A604D]">
            80mm Thermal Receipt Layout
          </span>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-[#2C1E15] hover:bg-[#1A1009] text-white px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#E5C158]" />
            <span>Print Receipt</span>
          </button>
        </div>

      </div>
    </div>
  );
};
