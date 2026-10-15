import { ModernBackButton } from './ModernBackButton';
import React, { useState } from 'react';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Send, 
  CheckCircle2, 
  Navigation, 
  MessageSquare, 
  Sparkles,
  Car,
  ShieldCheck,
  Compass,
  Zap,
  ExternalLink,
  Copy,
  Check,
  CreditCard,
  Building2
} from 'lucide-react';
import { VillaLogo } from './VillaLogo';
import { InquiryRecord } from '../types';

interface ContactTabProps {
  onAddInquiry?: (inquiry: InquiryRecord) => void;
  onInquirySubmitted?: () => void;
  onBookNow?: () => void;
  onNavigate?: (tab: any) => void;
  onBack?: () => void;
}

export const ContactTab: React.FC<ContactTabProps> = ({ 
  onAddInquiry, 
  onInquirySubmitted, 
  onBookNow,
  onNavigate,
  onBack
}) => {
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [roomInterest, setRoomInterest] = useState('General Staycation Inquiry');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  const contactNumbers = [
    { label: 'Primary Hotline (Globe / TM)', number: '+63 9175681408', raw: '+639175681408' },
    { label: 'Secondary Hotline (Globe / TM)', number: '+63 9171562062', raw: '+639171562062' },
    { label: 'DITO / Smart Support', number: '+63 9912960718', raw: '+639912960718' },
  ];

  const landmarks = [
    { name: 'Calle Crisologo & Heritage Village', distance: '2.4 km', time: '5–7 mins', type: 'Heritage Attraction' },
    { name: 'Plaza Salcedo & Dancing Fountain', distance: '2.8 km', time: '6–8 mins', type: 'Town Plaza & Shows' },
    { name: 'Vigan Cathedral & Archbishop Palace', distance: '2.9 km', time: '6–8 mins', type: 'Historical Landmark' },
    { name: 'Baluarte Zoo & Safari Gallery', distance: '4.1 km', time: '8–10 mins', type: 'Family Destination' },
    { name: 'Bantay Bell Tower & Church', distance: '3.5 km', time: '8–10 mins', type: 'Scenic Heritage' },
    { name: 'Hidden Garden Restaurant & Pottery', distance: '3.2 km', time: '7–9 mins', type: 'Dining & Crafts' },
  ];

  const handleCopy = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedNumber(num);
    setTimeout(() => setCopiedNumber(null), 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !guestPhone) return;

    if (onAddInquiry) {
      const newInq: InquiryRecord = {
        id: `INQ-${Math.floor(1000 + Math.random() * 9000)}`,
        fullName: guestName,
        phone: guestPhone,
        email: guestEmail || 'Not provided',
        roomInterest,
        message,
        createdAt: new Date().toISOString(),
        status: 'New',
      };
      onAddInquiry(newInq);
    }

    if (onInquirySubmitted) {
      onInquirySubmitted();
    }

    setSubmitted(true);
    setGuestName('');
    setGuestPhone('');
    setGuestEmail('');
    setMessage('');
    setTimeout(() => setSubmitted(false), 6000);
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Modern Animated Back Button */}
      {(onNavigate || onBack) && (
        <div className="flex items-center justify-between">
          <ModernBackButton 
            onClick={() => onBack ? onBack() : onNavigate?.("explore")}
            label="Back to Main Page"
            sublabel="Return to resort showcase & rooms"
          />
        </div>
      )}
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#D4AF37]/20 to-[#B8860B]/20 border border-[#E6D7C3] px-4 py-1.5 rounded-full text-xs font-bold text-[#8B6B10] uppercase tracking-[0.18em]">
          <VillaLogo size={20} variant="gold" />
          <span>Direct Concierge &amp; Property Information</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#2C1E15] tracking-tight">
          Find Us &amp; Get in Touch
        </h2>
        <p className="text-sm sm:text-base text-[#6E5544] max-w-2xl mx-auto leading-relaxed">
          Located conveniently along Vigan Diversion Road in Barangay CabalangeGan. Easy bypass access without downtown traffic, just minutes from the UNESCO World Heritage zone.
        </p>
      </div>

      {/* 3 Quick Action Contact Badges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {contactNumbers.map((item, idx) => (
          <div 
            key={idx}
            className="bg-white rounded-2xl p-4.5 border border-[#E6D7C3] shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-3 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E6D7C3] text-[#8B6B10] flex items-center justify-center shrink-0 group-hover:bg-[#D4AF37]/20 transition-colors">
                <Phone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-[#786150] truncate">{item.label}</p>
                <a 
                  href={`tel:${item.raw}`}
                  className="font-bold text-sm text-[#2C1E15] hover:text-[#B8860B] transition-colors tracking-wide"
                >
                  {item.number}
                </a>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(item.number)}
              className="p-2 rounded-lg text-[#786150] hover:text-[#2C1E15] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
              title="Copy phone number"
            >
              {copiedNumber === item.number ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Main Grid: Left Informative Cards & Right Interactive Inquiry Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left 6 Columns: Address, Direct Contacts, Hours & Facilities */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Property Address & Directions Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E6D7C3] shadow-md space-y-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1F140C] to-[#382417] text-[#E5C158] flex items-center justify-center shadow-md shrink-0">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-[#2C1E15]">Diversion Road Sanctuary</h3>
                <p className="text-xs text-[#6E5544]">Barangay CabalangeGan, Vigan City</p>
              </div>
            </div>

            <div className="space-y-2 text-xs sm:text-sm text-[#4A3222] border-t border-[#E6D7C3]/70 pt-3.5">
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 text-[#8B6B10] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-[#2C1E15]">Diversion Vigan Transient &amp; Events Place</p>
                  <p className="text-xs text-[#6E5544] mt-0.5">
                    Diversion Road, Brgy CabalangeGan, Vigan City, Ilocos Sur 2700, Philippines
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Navigation Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <a
                href="https://www.google.com/maps/place/Diversion+Vigan+Transient+%26+Private+Villa/@17.5666815,120.3921488,269m/data=!3m1!1e3!4m10!1m2!2m1!1sdiversion+road+brgy+cabalangan+vigan+city+ilocos+sur!3m6!1s0x338e651f9dfcba0d:0x4a48f2f25443ecf0!8m2!3d17.5667039!4d120.3928579!15sCjRkaXZlcnNpb24gcm9hZCBicmd5IGNhYmFsangaZ2FuIHZpZ2FuIGNpdHkgaWxvY29zIHN1clowMiRkaXZlcnNpb24gcm9hZCBicmd5IGNhYmFsangaZ2FuIHZpZ2FuIGNpdHkgaWxvY29zIHN1clSAQNpbm6aASRDaGREU1VoTk1HOW5TMFZKUTBGblRVUnZjRGRxVnpCblJSQULgAQD6AQQIABAq!16s%2Fg%2F11kr94q0_6?entry=ttu&g_ep=EgoyMDI2MTAxMi4wIKXMDSoASAFQAw%3D%3D"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-[#FAF7F2] hover:bg-[#F2ECE1] border border-[#E6D7C3] text-xs font-bold text-[#2C1E15] flex items-center justify-center gap-2 transition-colors cursor-pointer group"
              >
                <Navigation className="w-3.5 h-3.5 text-[#B8860B] group-hover:rotate-12 transition-transform" />
                <span>Open in Google Maps</span>
                <ExternalLink className="w-3 h-3 text-[#786150]" />
              </a>

              <a
                href="https://waze.com/ul?q=Diversion+Vigan"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-[#FAF7F2] hover:bg-[#F2ECE1] border border-[#E6D7C3] text-xs font-bold text-[#2C1E15] flex items-center justify-center gap-2 transition-colors cursor-pointer group"
              >
                <Compass className="w-3.5 h-3.5 text-[#B8860B] group-hover:rotate-12 transition-transform" />
                <span>Navigate with Waze</span>
                <ExternalLink className="w-3 h-3 text-[#786150]" />
              </a>
            </div>
          </div>

          {/* Stay Timings & House Policies */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E6D7C3] shadow-md space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E6D7C3] text-[#8B6B10] flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#2C1E15]">Operating Hours &amp; Schedule</h4>
                <p className="text-xs text-[#6E5544]">24/7 Gated Access &amp; Front Desk</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E6D7C3]/80 space-y-1">
                <span className="text-[11px] text-[#786150] block font-medium">Standard Check-In</span>
                <strong className="text-sm text-[#2C1E15] block font-serif">2:00 PM</strong>
                <span className="text-[10px] text-[#8B6B10] block">Early check-in upon request</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E6D7C3]/80 space-y-1">
                <span className="text-[11px] text-[#786150] block font-medium">Standard Check-Out</span>
                <strong className="text-sm text-[#2C1E15] block font-serif">12:00 PM</strong>
                <span className="text-[10px] text-[#8B6B10] block">Noon clearance</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E6D7C3]/80 space-y-1">
                <span className="text-[11px] text-[#786150] block font-medium">Short Stay / Hourly</span>
                <strong className="text-sm text-[#2C1E15] block font-serif">24 Hours</strong>
                <span className="text-[10px] text-[#8B6B10] block">3h / 6h / 12h available</span>
              </div>
            </div>

            {/* Parking & Security note */}
            <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-start gap-3 text-xs text-[#523A28]">
              <Car className="w-4 h-4 text-[#B8860B] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#2C1E15]">Free Gated Parking &amp; 24/7 Security:</strong>
                <p className="text-[11px] text-[#6E5544] mt-0.5">
                  Spacious on-site parking accommodating private cars, SUVs, and tourist vans with continuous CCTV surveillance.
                </p>
              </div>
            </div>
          </div>

          {/* Payment & Verification Guidelines */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E6D7C3] shadow-md space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E6D7C3] text-[#8B6B10] flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#2C1E15]">Accepted Payment Methods</h4>
                <p className="text-xs text-[#6E5544]">Fast digital verification on reservation</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs text-center font-medium">
              <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E6D7C3] text-[#2C1E15]">
                <span className="block font-bold text-blue-600">GCash</span>
                <span className="text-[10px] text-[#786150]">Direct QR / No.</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E6D7C3] text-[#2C1E15]">
                <span className="block font-bold text-emerald-600">Maya</span>
                <span className="text-[10px] text-[#786150]">Wallet Transfer</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E6D7C3] text-[#2C1E15]">
                <span className="block font-bold text-red-700">BDO / BPI</span>
                <span className="text-[10px] text-[#786150]">Bank Deposit</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E6D7C3] text-[#2C1E15]">
                <span className="block font-bold text-[#8B6B10]">Cash</span>
                <span className="text-[10px] text-[#786150]">Front Desk Arrival</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right 6 Columns: Interactive Direct Inquiry Form & Proximity Guide */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Direct Inquiry Form Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6D7C3] shadow-xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex items-center justify-between border-b border-[#E6D7C3]/60 pb-4">
              <div>
                <h3 className="font-serif font-bold text-xl text-[#2C1E15]">Send Direct Inquiry</h3>
                <p className="text-xs text-[#6E5544]">We will reply promptly via Phone Call or SMS</p>
              </div>
              <MessageSquare className="w-6 h-6 text-[#8B6B10]" />
            </div>

            {submitted && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs sm:text-sm font-medium flex items-center gap-3 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Thank you! Your inquiry has been sent to our reservations officer. We will call/text you shortly.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#2C1E15] uppercase tracking-wider mb-1.5">
                    Your Full Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maria Santos"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#E6D7C3] bg-[#FAF7F2] text-sm text-[#2C1E15] outline-none focus:ring-2 focus:ring-[#B8860B] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C1E15] uppercase tracking-wider mb-1.5">
                    Phone Number <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0917 568 1408"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#E6D7C3] bg-[#FAF7F2] text-sm text-[#2C1E15] outline-none focus:ring-2 focus:ring-[#B8860B] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#2C1E15] uppercase tracking-wider mb-1.5">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="guest@example.com"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#E6D7C3] bg-[#FAF7F2] text-sm text-[#2C1E15] outline-none focus:ring-2 focus:ring-[#B8860B] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C1E15] uppercase tracking-wider mb-1.5">
                    Room / Accommodation Interest
                  </label>
                  <select
                    value={roomInterest}
                    onChange={(e) => setRoomInterest(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#E6D7C3] bg-[#FAF7F2] text-sm text-[#2C1E15] outline-none focus:ring-2 focus:ring-[#B8860B] transition-all cursor-pointer"
                  >
                    <option value="General Staycation Inquiry">General Staycation Inquiry</option>
                    <option value="Private Villa (Whole Compound)">Private Villa (Whole Compound &amp; Pool)</option>
                    <option value="Transient Room 1 (Couples/Small Family)">Transient Room 1 (Couples / Small Family)</option>
                    <option value="Transient Room 2 (8 - 10 Pax)">Transient Room 2 (8 - 10 Pax)</option>
                    <option value="Transient Room 3 (Barkada Suite)">Transient Room 3 (Barkada Suite)</option>
                    <option value="Events & Birthday Gathering">Events &amp; Birthday Gathering</option>
                    <option value="Short Stay / Hourly Inquiry">Short Stay / Hourly Inquiry (3h / 6h / 12h)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C1E15] uppercase tracking-wider mb-1.5">
                  Message / Target Dates / Guest Count
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Tell us your target check-in date, number of guests, or special requirements..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#E6D7C3] bg-[#FAF7F2] text-sm text-[#2C1E15] outline-none focus:ring-2 focus:ring-[#B8860B] transition-all resize-none"
                ></textarea>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#997A15] hover:from-[#A67908] hover:to-[#B8860B] text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/20 active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Inquiry to Front Desk</span>
                </button>

                {onBookNow && (
                  <button
                    type="button"
                    onClick={onBookNow}
                    className="text-xs font-bold text-[#8B6B10] hover:text-[#2C1E15] hover:underline flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Instant Online Booking</span>
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Landmark & Distance Guide Card */}
          <div className="bg-gradient-to-br from-[#1F140C] via-[#2A1A0F] to-[#180F09] rounded-3xl p-6 sm:p-7 text-white border border-[#E6D7C3]/30 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#E5C158] flex items-center justify-center shrink-0">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-base text-white">Proximity to Vigan Landmarks</h4>
                  <p className="text-xs text-[#E6D7C3]/80">Quick travel times from Diversion Road</p>
                </div>
              </div>
              <span className="text-[10px] bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#E5C158] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider hidden sm:inline-block">
                Scenic Location
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              {landmarks.map((landmark, idx) => (
                <div 
                  key={idx}
                  className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-[#D4AF37]/40 transition-colors flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate text-[11px]">{landmark.name}</p>
                    <p className="text-[10px] text-[#E6D7C3]/70">{landmark.type}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-[#E5C158] text-xs block">{landmark.time}</span>
                    <span className="text-[10px] text-[#E6D7C3]/60">{landmark.distance}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-[#E6D7C3]/70">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#E5C158]" />
                Easy bypass road avoiding downtown congestion
              </span>
              <a 
                href="tel:+639175681408" 
                className="text-[#E5C158] hover:underline font-bold"
              >
                Call for Directions →
              </a>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
