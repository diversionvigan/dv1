import React from 'react';
import { X, CheckCircle2, Ban } from 'lucide-react';
import { BookingRecord } from '../types';

interface SlipLightboxModalProps {
  booking: BookingRecord | null;
  onClose: () => void;
  onVerify?: (bookingId: string) => void;
  onReject?: (bookingId: string, reason: string) => void;
}

export const SlipLightboxModal: React.FC<SlipLightboxModalProps> = ({
  booking,
  onClose,
  onVerify,
  onReject,
}) => {
  if (!booking || !booking.paymentSlipUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative max-w-2xl w-full bg-[#FAF7F2] rounded-3xl border border-[#E6D7C3] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 px-6 bg-[#1F140C] text-white flex items-center justify-between border-b border-[#D4AF37]/30">
          <div>
            <span className="text-[10px] text-[#E5C158] uppercase font-bold tracking-wider block font-monogram">
              Verified Payment Receipt Preview
            </span>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>{booking.guestName}</span>
              <span className="text-xs text-[#E6D7C3]/70 font-mono">({booking.id})</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[#E6D7C3] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Image Area */}
        <div className="p-4 overflow-y-auto flex-1 flex items-center justify-center bg-stone-900/40 min-h-[300px]">
          <img
            src={booking.paymentSlipUrl}
            alt={`Payment Slip for ${booking.id}`}
            className="max-h-[65vh] w-auto max-w-full rounded-xl shadow-lg object-contain"
          />
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-white border-t border-[#E6D7C3] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-[#6E5544]">
            Amount Paid: <strong className="text-[#2C1E15]">₱{booking.amountPaidNow.toLocaleString()}</strong> via{' '}
            <strong className="uppercase text-[#8B6B10]">{booking.paymentMethod}</strong>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {booking.status === 'Pending Slip Review' && onVerify && (
              <button
                type="button"
                onClick={() => {
                  onVerify(booking.id);
                  onClose();
                }}
                className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve Slip</span>
              </button>
            )}

            {booking.status === 'Pending Slip Review' && onReject && (
              <button
                type="button"
                onClick={() => {
                  const reason = prompt('Reason for rejecting / voiding this deposit slip:', 'Unclear / invalid transaction reference');
                  if (reason) {
                    onReject(booking.id, `Slip rejected: ${reason}`);
                    onClose();
                  }
                }}
                className="flex-1 sm:flex-initial px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Ban className="w-4 h-4" />
                <span>Reject</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 bg-[#F6EFE5] hover:bg-[#E6D7C3] text-[#2C1E15] font-bold rounded-xl transition-colors cursor-pointer text-center"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
