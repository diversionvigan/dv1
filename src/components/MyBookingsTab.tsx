import { ModernBackButton } from './ModernBackButton';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookingRecord, 
  BookingStatus,
  GuestAccount
} from '../types';
import { 
  Calendar, 
  Clock, 
  Users, 
  CalendarCheck, 
  Search, 
  CheckCircle2, 
  Clock3, 
  ShieldCheck, 
  Sparkles, 
  Phone, 
  Mail, 
  UserCheck, 
  Copy, 
  Check, 
  ExternalLink, 
  AlertCircle, 
  CreditCard,
  FileText,
  Compass,
  ChevronRight,
  User,
  Crown,
  LogIn,
  LogOut,
  UserPlus,
  KeyRound,
  Eye,
  EyeOff,
  ShieldAlert,
  Info,
  Timer,
  RefreshCw,
  Trash2,
  X
} from 'lucide-react';
import { VillaLogo } from './VillaLogo';
import {
  getActiveGuestSession,
  signInGuest,
  registerGuestAccount,
  signOutGuest,
  purgeInactiveGuestAccounts,
  calculateDaysRemaining,
  INACTIVITY_DAYS_LIMIT
} from '../utils/guestAuth';

interface MyBookingsTabProps {
  bookings: BookingRecord[];
  rooms: any[]; // RoomUnit[]
  onOpenVoucher: (booking: BookingRecord) => void;
  onOpenSlipLightbox?: (booking: BookingRecord) => void;
  onBookNow?: () => void;
  onRebookBooking?: (bookingId: string, updatedFields: Partial<BookingRecord>, note: string) => void;
  onNavigate?: (tab: any) => void;
  onBack?: () => void;
}

export const MyBookingsTab: React.FC<MyBookingsTabProps> = ({
  bookings,
  rooms,
  onOpenVoucher,
  onOpenSlipLightbox,
  onBookNow,
  onRebookBooking,
  onNavigate,
  onBack,
}) => {
  // Active guest session state
  const [currentGuest, setCurrentGuest] = useState<GuestAccount | null>(() => {
    return getActiveGuestSession();
  });

  // Auth Portal tab: 'signin' | 'register' | 'lookup'
  const [authMode, setAuthMode] = useState<'signin' | 'register' | 'lookup'>('signin');
  
  // Sign In inputs
  const [signInIdentifier, setSignInIdentifier] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Register inputs
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Direct reference lookup input
  const [lookupRef, setLookupRef] = useState('');

  // UI status and messages
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [purgedNotice, setPurgedNotice] = useState<string | null>(null);

  // Bookings list controls
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');

  // REBOOKING STATES
  const [rebookTarget, setRebookTarget] = useState<BookingRecord | null>(null);
  const [rebookCheckIn, setRebookCheckIn] = useState('');
  const [rebookCheckOut, setRebookCheckOut] = useState('');
  const [rebookHourlyDate, setRebookHourlyDate] = useState('');
  const [rebookHourlyTime, setRebookHourlyTime] = useState('14:00');
  const [rebookHourlyHours, setRebookHourlyHours] = useState(3);
  const [isRebookingInProgress, setIsRebookingInProgress] = useState(false);
  const [rebookRoomId, setRebookRoomId] = useState('');
  const [rebookAdults, setRebookAdults] = useState(2);
  const [rebookChildren, setRebookChildren] = useState(0);

  const REBOOKING_FEE_PERCENT = 0.20;

  const rebookingResults = useMemo(() => {
    if (!rebookTarget) return null;
    
    // Find the room object - use selected rebookRoomId or fallback to original
    const targetRoomId = rebookRoomId || rebookTarget.roomId.split(',')[0];
    const primaryRoom = rooms.find(r => r.id === targetRoomId) || rooms[0];

    let newStayTotal = 0;
    let nightsCount = 1;

    if (rebookTarget.stayType === 'nightly') {
      if (rebookCheckIn && rebookCheckOut) {
        const start = new Date(rebookCheckIn).getTime();
        const end = new Date(rebookCheckOut).getTime();
        const diffDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
        nightsCount = diffDays;
        newStayTotal = (primaryRoom.pricing?.nightly || 0) * diffDays;
      }
    } else {
      const baseHourRate = rebookHourlyHours === 3 ? (primaryRoom.pricing?.hourly3hr || 1500) :
        rebookHourlyHours === 6 ? (primaryRoom.pricing?.hourly6hr || 2500) : (primaryRoom.pricing?.hourly12hr || 4000);
      newStayTotal = baseHourRate;
    }

    // EXTRA PAX CALCULATION (If exceeds base pax)
    const basePax = primaryRoom.basePax || 2;
    const extraPaxPrice = primaryRoom.pricing?.extraPax || 500;
    const totalGuests = rebookAdults + rebookChildren;
    if (totalGuests > basePax) {
      const extraCount = totalGuests - basePax;
      const extraCost = extraCount * extraPaxPrice * (rebookTarget.stayType === 'nightly' ? nightsCount : 1);
      newStayTotal += extraCost;
    }

    const rebookingFee = Math.round(rebookTarget.grandTotal * REBOOKING_FEE_PERCENT);
    const addonsCost = rebookTarget.addonsTotal || 0;
    const discount = rebookTarget.discountAmount || 0;
    const newGrandTotal = Math.max(0, newStayTotal + addonsCost + rebookingFee - discount);
    const amountAlreadyPaid = rebookTarget.amountPaidNow;
    const newRemainingBalance = Math.max(0, newGrandTotal - amountAlreadyPaid);

    return {
      primaryRoom,
      nightsCount,
      newStayTotal,
      rebookingFee,
      addonsCost,
      newGrandTotal,
      amountAlreadyPaid,
      newRemainingBalance
    };
  }, [rebookTarget, rebookCheckIn, rebookCheckOut, rebookHourlyDate, rebookHourlyTime, rebookHourlyHours, rebookRoomId, rebookAdults, rebookChildren, rooms]);

  // Run 90-day cleanup on mount and check if account was purged
  useEffect(() => {
    const { purgedCount, currentSessionPurged } = purgeInactiveGuestAccounts();
    if (currentSessionPurged) {
      setCurrentGuest(null);
      setPurgedNotice(
        'Your previous guest session was automatically removed due to 90 days of inactivity. Please sign in or create a new account.'
      );
    } else if (purgedCount > 0) {
      console.log(`[Guest Security] Purged ${purgedCount} inactive guest account(s) beyond 90 days.`);
    }
  }, []);

  // Handle Guest Sign In
  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setPurgedNotice(null);

    const res = signInGuest(signInIdentifier, signInPassword);
    if (!res.success || !res.account) {
      setAuthError(res.error || 'Sign in failed. Please check your credentials.');
      return;
    }

    setCurrentGuest(res.account);
    setAuthSuccess(`Mabuhay, ${res.account.fullName}! You are now signed in.`);
    setSignInPassword('');
  };

  // Handle Create Guest Account
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setPurgedNotice(null);

    const res = registerGuestAccount({
      username: regUsername,
      password: regPassword,
      fullName: regFullName,
      phone: regPhone,
      email: regEmail,
    });

    if (!res.success || !res.account) {
      setAuthError(res.error || 'Failed to create account.');
      return;
    }

    setCurrentGuest(res.account);
    setAuthSuccess(`Welcome, ${res.account.fullName}! Your guest account is ready and active.`);
    setRegPassword('');
  };

  // Handle Guest Log Out
  const handleSignOut = () => {
    signOutGuest();
    setCurrentGuest(null);
    setAuthSuccess('You have signed out of your guest account.');
    setAuthError(null);
  };

  // Handle Quick Lookup by Booking ID / Phone
  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const clean = lookupRef.trim().toLowerCase();
    if (!clean) {
      setAuthError('Please enter a Booking Reference ID (e.g. DV-2026-...) or mobile phone number.');
      return;
    }

    // Try finding matching booking
    const found = bookings.find((b) => {
      const matchId = b.id.toLowerCase() === clean || b.id.toLowerCase().includes(clean);
      const matchPhone = b.guestPhone && b.guestPhone.replace(/[^0-9]/g, '').includes(clean.replace(/[^0-9]/g, ''));
      return matchId || matchPhone;
    });

    if (found) {
      // Auto-create or link temporary session
      const tempRes = registerGuestAccount({
        username: found.guestUsername || `guest_${found.guestPhone ? found.guestPhone.replace(/[^0-9]/g, '').slice(-4) : Date.now().toString().slice(-4)}`,
        password: found.guestPassword || '',
        fullName: found.guestName,
        phone: found.guestPhone,
        email: found.guestEmail,
        bookingId: found.id,
      });
      if (tempRes.account) {
        setCurrentGuest(tempRes.account);
        setAuthSuccess(`Found reservation for ${found.guestName}! Linked to your guest session.`);
        setLookupRef('');
      }
    } else {
      setAuthError(`No reservation found matching "${lookupRef}". Please verify your booking reference ID or phone.`);
    }
  };

  const handleOpenRebook = (booking: BookingRecord) => {
    setRebookTarget(booking);
    setRebookRoomId(booking.roomId.split(',')[0]);
    setRebookAdults(booking.adultGuests);
    setRebookChildren(booking.childGuests);
    setRebookCheckIn(booking.checkInDate || '');
    setRebookCheckOut(booking.checkOutDate || '');
    setRebookHourlyDate(booking.hourlyDate || '');
    setRebookHourlyTime(booking.hourlyStartTime || '14:00');
    setRebookHourlyHours(booking.hourlyDurationHours || 3);
  };

  const handleConfirmRebook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rebookTarget || !onRebookBooking || !rebookingResults) return;

    const { nightsCount, newGrandTotal, newRemainingBalance, newStayTotal } = rebookingResults;

    const updatedFields: Partial<BookingRecord> = {
      roomId: rebookRoomId,
      roomTitle: rebookingResults.primaryRoom.title,
      adultGuests: rebookAdults,
      childGuests: rebookChildren,
      checkInDate: rebookTarget.stayType === 'nightly' ? rebookCheckIn : undefined,
      checkOutDate: rebookTarget.stayType === 'nightly' ? rebookCheckOut : undefined,
      numberOfNights: rebookTarget.stayType === 'nightly' ? nightsCount : undefined,
      hourlyDate: rebookTarget.stayType === 'hourly' ? rebookHourlyDate : undefined,
      hourlyStartTime: rebookTarget.stayType === 'hourly' ? rebookHourlyTime : undefined,
      hourlyDurationHours: rebookTarget.stayType === 'hourly' ? rebookHourlyHours : undefined,
      baseStayTotal: newStayTotal,
      grandTotal: newGrandTotal,
      remainingBalance: newRemainingBalance,
    };

    const note = `Guest initiated rebooking via account portal (+20% fee applied: ₱${rebookingResults.rebookingFee.toLocaleString()})`;
    onRebookBooking(rebookTarget.id, updatedFields, note);

    setAuthSuccess(`Rebooking successful for ${rebookTarget.id}! Dates have been updated.`);
    setRebookTarget(null);
  };

  // Filter bookings linked to current guest
  const guestBookings = useMemo(() => {
    if (!currentGuest) return [];

    const guestPhoneDigits = currentGuest.phone ? currentGuest.phone.replace(/[^0-9]/g, '') : '';
    const guestEmailLower = currentGuest.email ? currentGuest.email.trim().toLowerCase() : '';
    const guestUsernameLower = currentGuest.username ? currentGuest.username.trim().toLowerCase() : '';
    const linkedIds = currentGuest.bookingIds || [];

    return bookings.filter((b) => {
      // 1. Direct linked booking ID
      if (linkedIds.includes(b.id)) return true;

      // 2. Matching username
      if (b.guestUsername && b.guestUsername.trim().toLowerCase() === guestUsernameLower) return true;

      // 3. Matching phone number
      if (guestPhoneDigits && b.guestPhone) {
        const bDigits = b.guestPhone.replace(/[^0-9]/g, '');
        if (bDigits && (bDigits === guestPhoneDigits || bDigits.includes(guestPhoneDigits) || guestPhoneDigits.includes(bDigits))) {
          return true;
        }
      }

      // 4. Matching email
      if (guestEmailLower && b.guestEmail && b.guestEmail.trim().toLowerCase() === guestEmailLower) {
        return true;
      }

      return false;
    });
  }, [bookings, currentGuest]);

  // Combined list with search filter
  const displayedBookings = useMemo(() => {
    let list = guestBookings;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((b) =>
        b.id.toLowerCase().includes(q) ||
        b.guestName.toLowerCase().includes(q) ||
        b.guestPhone.toLowerCase().includes(q) ||
        (b.guestEmail && b.guestEmail.toLowerCase().includes(q)) ||
        b.roomTitle.toLowerCase().includes(q)
      );
    }

    if (filterStatus === 'active') {
      list = list.filter((b) => b.status === 'Confirmed' || b.status === 'Pending Slip Review' || b.status === 'Checked-In');
    } else if (filterStatus === 'completed') {
      list = list.filter((b) => b.status === 'Completed' || b.status === 'Cancelled');
    }

    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [guestBookings, searchQuery, filterStatus]);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const renderStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'Confirmed':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Confirmed</span>
          </span>
        );
      case 'Pending Slip Review':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
            <Clock3 className="w-3.5 h-3.5 text-amber-600" />
            <span>Pending Slip Review</span>
          </span>
        );
      case 'Checked-In':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-900 border border-blue-300 text-xs font-bold px-2.5 py-1 rounded-full">
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Checked-In (Enjoy Stay)</span>
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-800 border border-gray-300 text-xs font-bold px-2.5 py-1 rounded-full">
            <Check className="w-3.5 h-3.5 text-gray-600" />
            <span>Completed Stay</span>
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-900 border border-rose-300 text-xs font-bold px-2.5 py-1 rounded-full">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return null;
    }
  };

  const daysRemaining = currentGuest ? calculateDaysRemaining(currentGuest.lastActiveAt || currentGuest.createdAt) : INACTIVITY_DAYS_LIMIT;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
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
      
      {/* 90-Day Auto Removal Notice if expired session */}
      {purgedNotice && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-3 shadow-xs">
          <Timer className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">Account Cleanup Policy Applied</div>
            <p className="leading-relaxed text-amber-800/90">{purgedNotice}</p>
          </div>
        </div>
      )}

      {/* Global Success / Error notifications */}
      {authSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{authSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setAuthSuccess(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {authError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{authError}</span>
          </div>
          <button
            type="button"
            onClick={() => setAuthError(null)}
            className="text-xs text-rose-700 hover:text-rose-900 font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* VIEW A: LOGGED IN GUEST VIEW */}
      {currentGuest ? (
        <div className="space-y-8">
          {/* Top Banner / Account Header */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1F140C] via-[#2C1E15] to-[#1F140C] text-white p-6 sm:p-8 border border-[#D4AF37]/50 shadow-xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:20px_20px] opacity-15 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2.5 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-gradient-to-r from-[#B8860B] to-[#E5C158] text-[#1F140C] text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider flex items-center gap-1">
                    <Crown className="w-3 h-3 text-[#1F140C]" />
                    Direct Guest Account
                  </span>
                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Active Guest Session
                  </span>
                </div>

                <h1 className="font-brand font-black text-2xl sm:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-[#FFFDF7] via-[#FFF2CC] to-[#E5C158] tracking-wide">
                  Welcome back, {currentGuest.fullName}!
                </h1>

                <p className="text-xs sm:text-sm text-[#E6D7C3]/90 leading-relaxed font-light">
                  Manage your confirmed bookings, print official digital vouchers, and track payment receipts anytime.
                </p>

                {/* 90-day inactivity policy info bar */}
                <div className="pt-2 flex flex-wrap items-center gap-3 text-[11px] text-[#E6D7C3]/80">
                  <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-xl border border-white/10">
                    <Timer className="w-3.5 h-3.5 text-[#E5C158]" />
                    <span>Auto-removal after 90 days of inactivity: <strong className="text-emerald-400">{daysRemaining} days remaining</strong></span>
                  </div>
                  <span className="text-[10px] text-[#E6D7C3]/60">• Activity auto-renews upon reservation or login</span>
                </div>
              </div>

              {/* Guest Account Card with prominent Log Out button */}
              <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-[#D4AF37]/40 space-y-4 shrink-0 md:min-w-[300px]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#B8860B] to-[#E5C158] flex items-center justify-center text-[#1F140C] shadow-md shrink-0 font-bold text-lg">
                    {currentGuest.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-[#FFFDF7] truncate">
                      {currentGuest.fullName}
                    </div>
                    <div className="text-xs text-[#E5C158] flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <span>{currentGuest.phone}</span>
                    </div>
                    {currentGuest.username && (
                      <div className="text-[11px] text-[#E6D7C3]/90 font-mono">
                        User: @{currentGuest.username}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-white/15 flex items-center justify-between text-xs text-[#E6D7C3]">
                  <span className="flex items-center gap-1 text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Verified Guest Profile
                  </span>
                  <span className="font-mono text-xs text-[#E5C158] font-bold">
                    {guestBookings.length} {guestBookings.length === 1 ? 'Reservation' : 'Reservations'}
                  </span>
                </div>

                {/* Log Out Button */}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full py-2 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-300/40 text-rose-200 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out / Sign Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* Lookup & Filter Toolbar */}
          <div className="bg-[#FAF7F2] p-4 sm:p-5 rounded-2xl border border-[#E6D7C3] flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Bar */}
            <div className="relative w-full md:max-w-md">
              <Search className="w-4 h-4 text-[#8B6B10] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by Booking ID (e.g. DV-2026-...), phone, or room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E6D7C3] bg-white text-xs sm:text-sm text-[#2C1E15] outline-none focus:ring-2 focus:ring-amber-500/40 transition-all placeholder:text-[#A08875]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8B6B10] hover:text-[#2C1E15] font-bold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Status Filter Buttons + Book Another CTA */}
            <div className="flex items-center justify-between w-full md:w-auto gap-2 flex-wrap">
              <div className="flex items-center bg-white rounded-xl border border-[#E6D7C3] p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterStatus === 'all'
                      ? 'bg-[#1F140C] text-[#FFFDF7] shadow-xs'
                      : 'text-[#786150] hover:text-[#2C1E15]'
                  }`}
                >
                  All ({guestBookings.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('active')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterStatus === 'active'
                      ? 'bg-[#1F140C] text-[#FFFDF7] shadow-xs'
                      : 'text-[#786150] hover:text-[#2C1E15]'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('completed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterStatus === 'completed'
                      ? 'bg-[#1F140C] text-[#FFFDF7] shadow-xs'
                      : 'text-[#786150] hover:text-[#2C1E15]'
                  }`}
                >
                  Past
                </button>
              </div>

              {onBookNow && (
                <button
                  type="button"
                  onClick={onBookNow}
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#997A15] hover:brightness-110 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Book Another Room</span>
                </button>
              )}
            </div>
          </div>

          {/* Bookings List */}
          {displayedBookings.length > 0 ? (
            <div className="space-y-5">
              {displayedBookings.map((booking) => {
                const isNightly = booking.stayType === 'nightly';
                const hasAddons = booking.addons && booking.addons.length > 0;

                return (
                  <div
                    key={booking.id}
                    className="bg-white rounded-3xl border border-[#E6D7C3] overflow-hidden shadow-sm hover:shadow-md transition-all space-y-0"
                  >
                    {/* Header bar */}
                    <div className="bg-[#FAF7F2] px-6 py-4 border-b border-[#E6D7C3] flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#2C1E15] text-[#FAF7F2] flex items-center justify-center font-serif font-black text-sm">
                          <VillaLogo size={20} variant="gold" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-[#2C1E15]">
                              {booking.id}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(booking.id)}
                              className="text-[#8B6B10] hover:text-[#2C1E15] p-1 rounded transition-colors"
                              title="Copy Booking ID"
                            >
                              {copiedId === booking.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <div className="text-[11px] text-[#786150]">
                            Booked on {new Date(booking.createdAt).toLocaleDateString("en-PH", {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {renderStatusBadge(booking.status)}
                      </div>
                    </div>

                    {/* Content Body */}
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Left Column: Room & Stay Info */}
                      <div className="lg:col-span-7 space-y-4">
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FAF7F2] text-[#8B6B10] border border-[#E6D7C3] text-[11px] font-bold uppercase tracking-wider mb-1.5">
                            <Compass className="w-3 h-3" />
                            <span>{isNightly ? 'Nightly Stay Accommodation' : 'Hourly Transient Block'}</span>
                          </div>
                          <h3 className="font-serif font-bold text-xl text-[#2C1E15]">
                            {booking.roomTitle}
                          </h3>
                        </div>

                        {/* Stay Date Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#FAF7F2] p-4 rounded-2xl border border-[#E6D7C3]/80">
                          {isNightly ? (
                            <>
                              <div>
                                <div className="text-[11px] text-[#786150] flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-[#8B6B10]" />
                                  <span>Check-In</span>
                                </div>
                                <div className="text-xs font-bold text-[#2C1E15] mt-0.5">
                                  {booking.checkInDate || 'N/A'}
                                </div>
                                <div className="text-[10px] text-[#8B6B10]">2:00 PM standard</div>
                              </div>

                              <div>
                                <div className="text-[11px] text-[#786150] flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-[#8B6B10]" />
                                  <span>Check-Out</span>
                                </div>
                                <div className="text-xs font-bold text-[#2C1E15] mt-0.5">
                                  {booking.checkOutDate || 'N/A'}
                                </div>
                                <div className="text-[10px] text-[#8B6B10]">12:00 NN standard</div>
                              </div>

                              <div>
                                <div className="text-[11px] text-[#786150] flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-[#8B6B10]" />
                                  <span>Duration</span>
                                </div>
                                <div className="text-xs font-bold text-[#2C1E15] mt-0.5">
                                  {booking.numberOfNights} {booking.numberOfNights === 1 ? 'Night' : 'Nights'}
                                </div>
                                <div className="text-[10px] text-emerald-700 font-medium">Standard stay</div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <div className="text-[11px] text-[#786150] flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-[#8B6B10]" />
                                  <span>Date of Stay</span>
                                </div>
                                <div className="text-xs font-bold text-[#2C1E15] mt-0.5">
                                  {booking.hourlyDate || 'N/A'}
                                </div>
                              </div>

                              <div>
                                <div className="text-[11px] text-[#786150] flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-[#8B6B10]" />
                                  <span>Start Time</span>
                                </div>
                                <div className="text-xs font-bold text-[#2C1E15] mt-0.5">
                                  {booking.hourlyStartTime || 'Flexible'}
                                </div>
                              </div>

                              <div>
                                <div className="text-[11px] text-[#786150] flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-[#8B6B10]" />
                                  <span>Duration</span>
                                </div>
                                <div className="text-xs font-bold text-[#2C1E15] mt-0.5">
                                  {booking.hourlyDurationHours} Hours Block
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Guest & Occupancy info */}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-[#786150]">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-[#8B6B10]" />
                            <span>
                              Guests: <strong>{booking.adultGuests} Adults</strong>
                              {booking.childGuests > 0 && ` + ${booking.childGuests} Children`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-[#8B6B10]" />
                            <span>{booking.guestPhone}</span>
                          </div>
                          {booking.guestEmail && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-[#8B6B10]" />
                              <span>{booking.guestEmail}</span>
                            </div>
                          )}
                        </div>

                        {/* Add-ons if any */}
                        {hasAddons && (
                          <div className="space-y-1.5 pt-2">
                            <div className="text-xs font-bold text-[#2C1E15]">Reserved Add-ons &amp; Services:</div>
                            <div className="flex flex-wrap gap-1.5">
                              {booking.addons.map((add, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 bg-[#FAF7F2] text-[#2C1E15] border border-[#E6D7C3] px-2.5 py-1 rounded-lg text-xs"
                                >
                                  <Sparkles className="w-3 h-3 text-[#8B6B10]" />
                                  <span>{add.name} (x{add.quantity})</span>
                                  <span className="font-mono text-[#8B6B10] font-bold">₱{add.cost.toLocaleString()}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Column: Financial Breakdown & Actions */}
                      <div className="lg:col-span-5 space-y-4 lg:border-l lg:border-[#E6D7C3] lg:pl-6 flex flex-col justify-between">
                        <div className="space-y-2.5">
                          <div className="text-xs font-bold text-[#2C1E15] uppercase tracking-wider">
                            Payment &amp; Billing Summary
                          </div>

                          <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E6D7C3] space-y-2 text-xs">
                            <div className="flex justify-between text-[#786150]">
                              <span>Base Accommodation:</span>
                              <span className="font-mono">₱{booking.baseStayTotal.toLocaleString()}</span>
                            </div>

                            {booking.addonsTotal > 0 && (
                              <div className="flex justify-between text-[#786150]">
                                <span>Add-ons Total:</span>
                                <span className="font-mono">₱{booking.addonsTotal.toLocaleString()}</span>
                              </div>
                            )}

                            <div className="pt-2 border-t border-[#E6D7C3] flex justify-between items-center text-sm font-bold text-[#2C1E15]">
                              <span>Grand Total:</span>
                              <span className="text-base font-black text-amber-950 font-mono">
                                ₱{booking.grandTotal.toLocaleString()}
                              </span>
                            </div>

                            {/* Paid vs Balance */}
                            <div className="pt-2 border-t border-dashed border-[#E6D7C3] space-y-1.5 text-xs">
                              <div className="flex justify-between items-center text-emerald-800 font-bold">
                                <span>Amount Paid ({booking.paymentOption === 'partial_40' ? '40% Downpayment' : 'Full Payment'}):</span>
                                <span className="font-mono">₱{booking.amountPaidNow.toLocaleString()}</span>
                              </div>

                              <div className="flex justify-between items-center text-[#786150]">
                                <span>Remaining Balance at Check-In:</span>
                                <span className="font-mono font-bold text-[#2C1E15]">
                                  ₱{booking.remainingBalance.toLocaleString()}
                                </span>
                              </div>

                              <div className="text-[10px] text-[#A08875] pt-0.5">
                                Payment Method: <strong className="uppercase text-[#523A2A]">{booking.paymentMethod}</strong>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2 pt-2">
                          <button
                            type="button"
                            onClick={() => onOpenVoucher(booking)}
                            className="w-full py-2.5 bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#997A15] hover:brightness-110 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                          >
                            <FileText className="w-4 h-4" />
                            <span>View / Print Official Booking Voucher</span>
                          </button>

                          {booking.paymentSlipUrl && onOpenSlipLightbox && (
                            <button
                              type="button"
                              onClick={() => onOpenSlipLightbox(booking)}
                              className="w-full py-2 bg-white hover:bg-[#FAF7F2] text-[#523A2A] border border-[#E6D7C3] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                              <CreditCard className="w-4 h-4 text-[#8B6B10]" />
                              <span>View Uploaded Payment Slip</span>
                            </button>
                          )}

                          {/* REBOOKING ACTION */}
                          {(booking.status === 'Confirmed' || booking.status === 'Pending Slip Review') && (
                            <button
                              type="button"
                              onClick={() => handleOpenRebook(booking)}
                              className="w-full py-2 bg-[#F5EDE0] hover:bg-[#EBDCCF] text-[#8B6B10] border border-[#D9C5B0] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Rebook / Change Stay Dates</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State for Logged In User */
            <div className="bg-white rounded-3xl border border-[#E6D7C3] p-10 sm:p-14 text-center space-y-5 max-w-2xl mx-auto shadow-sm">
              <div className="w-16 h-16 rounded-full bg-[#FAF7F2] border border-[#E6D7C3] flex items-center justify-center mx-auto text-[#8B6B10]">
                <CalendarCheck className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="font-serif font-bold text-xl text-[#2C1E15]">
                  No Bookings Found Under This Account
                </h3>
                <p className="text-xs sm:text-sm text-[#786150] leading-relaxed max-w-md mx-auto">
                  Reserve a transient room or the private villa now to lock in direct VIP rates, or search by booking reference ID.
                </p>
              </div>

              {searchQuery && (
                <div className="text-xs text-amber-900 bg-amber-50 p-3 rounded-xl border border-amber-200 inline-block">
                  No reservation matched &ldquo;{searchQuery}&rdquo;. Check your booking reference number or phone.
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                {onBookNow && (
                  <button
                    type="button"
                    onClick={onBookNow}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#997A15] hover:brightness-110 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Compass className="w-4 h-4" />
                    <span>Explore Rooms &amp; Reserve</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* VIEW B: GUEST AUTHENTICATION PORTAL (SIGN IN / CREATE ACCOUNT / LOOKUP) */
        <div className="max-w-xl mx-auto space-y-6">
          
          {/* Top Welcome Card */}
          <div className="text-center space-y-3 bg-gradient-to-b from-[#FAF7F2] to-white p-6 sm:p-8 rounded-3xl border border-[#E6D7C3] shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-[#2C1E15] text-[#D4AF37] flex items-center justify-center mx-auto shadow-md border border-[#D4AF37]/30">
              <VillaLogo size={28} variant="gold" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#8B6B10] uppercase tracking-wider bg-[#FAF7F2] px-3 py-1 rounded-full border border-[#E6D7C3]">
                Guest Portal &amp; My Bookings
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#2C1E15] mt-2">
                Access Your Guest Account
              </h2>
              <p className="text-xs sm:text-sm text-[#786150] max-w-md mx-auto mt-1 leading-relaxed">
                Sign in to view your vouchers, check stay status, or create a guest account to manage all reservations.
              </p>
            </div>

            {/* 90-day auto-purge explanation badge */}
            <div className="mt-3 p-3 rounded-xl bg-[#FAF7F2] border border-[#E6D7C3]/80 text-[11px] text-[#786150] flex items-center justify-center gap-2">
              <Timer className="w-3.5 h-3.5 text-[#8B6B10]" />
              <span><strong>Privacy &amp; Security Policy:</strong> Inactive guest accounts are automatically removed after 90 days.</span>
            </div>
          </div>

          {/* Segmented Auth Mode Switcher */}
          <div className="grid grid-cols-3 p-1 rounded-2xl bg-[#FAF7F2] border border-[#E6D7C3]">
            <button
              type="button"
              onClick={() => { setAuthMode('signin'); setAuthError(null); }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'signin'
                  ? 'bg-[#1F140C] text-[#FFFDF7] shadow-sm'
                  : 'text-[#786150] hover:text-[#2C1E15]'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => { setAuthMode('register'); setAuthError(null); }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'register'
                  ? 'bg-[#1F140C] text-[#FFFDF7] shadow-sm'
                  : 'text-[#786150] hover:text-[#2C1E15]'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>

            <button
              type="button"
              onClick={() => { setAuthMode('lookup'); setAuthError(null); }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'lookup'
                  ? 'bg-[#1F140C] text-[#FFFDF7] shadow-sm'
                  : 'text-[#786150] hover:text-[#2C1E15]'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Quick Lookup</span>
            </button>
          </div>

          {/* FORM 1: SIGN IN */}
          {authMode === 'signin' && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E6D7C3] shadow-sm space-y-5">
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-lg text-[#2C1E15] flex items-center gap-2">
                  <LogIn className="w-4 h-4 text-[#8B6B10]" />
                  <span>Sign In as Guest</span>
                </h3>
                <p className="text-xs text-[#786150]">
                  Enter your Username, Registered Mobile Phone, or Email Address.
                </p>
              </div>

              <form onSubmit={handleSignIn} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-[#2C1E15] mb-1">
                    Username, Phone, or Email
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. juan_vigan, 09175681408, or email"
                    value={signInIdentifier}
                    onChange={(e) => setSignInIdentifier(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6D7C3] bg-[#FDFBF7] text-sm text-[#2C1E15] font-medium outline-none focus:ring-2 focus:ring-[#2C1E15]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2C1E15] mb-1">
                    Password (Optional if not set)
                  </label>
                  <div className="relative">
                    <input
                      type={showSignInPassword ? 'text' : 'password'}
                      placeholder="Enter your guest password"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-[#E6D7C3] bg-[#FDFBF7] text-sm text-[#2C1E15] font-medium outline-none focus:ring-2 focus:ring-[#2C1E15]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#786150] hover:text-[#2C1E15] cursor-pointer"
                    >
                      {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#997A15] hover:brightness-110 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In &amp; Access My Bookings</span>
                </button>
              </form>

              <div className="pt-4 border-t border-[#E6D7C3]/80 flex items-center justify-between text-xs text-[#786150]">
                <span>Don&apos;t have an account yet?</span>
                <button
                  type="button"
                  onClick={() => { setAuthMode('register'); setAuthError(null); }}
                  className="font-bold text-[#8B6B10] hover:underline cursor-pointer"
                >
                  Create Guest Account
                </button>
              </div>
            </div>
          )}

          {/* FORM 2: CREATE ACCOUNT */}
          {authMode === 'register' && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E6D7C3] shadow-sm space-y-5">
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-lg text-[#2C1E15] flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#8B6B10]" />
                  <span>Create New Guest Account</span>
                </h3>
                <p className="text-xs text-[#786150]">
                  Register your guest credentials to manage current and future reservations.
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-[#2C1E15] mb-1">
                    Full Name <span className="text-rose-600 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Juan Dela Cruz"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6D7C3] bg-[#FDFBF7] text-sm text-[#2C1E15] font-medium outline-none focus:ring-2 focus:ring-[#2C1E15]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-[#2C1E15] mb-1">
                      Active Mobile Phone <span className="text-rose-600 font-bold">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 0917 568 1408"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6D7C3] bg-[#FDFBF7] text-sm text-[#2C1E15] font-medium outline-none focus:ring-2 focus:ring-[#2C1E15]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#2C1E15] mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. juan@gmail.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6D7C3] bg-[#FDFBF7] text-sm text-[#2C1E15] font-medium outline-none focus:ring-2 focus:ring-[#2C1E15]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-[#2C1E15] mb-1">
                      Choose Username <span className="text-rose-600 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. juan_vigan"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6D7C3] bg-[#FDFBF7] text-sm text-[#2C1E15] font-medium outline-none focus:ring-2 focus:ring-[#2C1E15]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#2C1E15] mb-1">
                      Password (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        placeholder="Choose password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-[#E6D7C3] bg-[#FDFBF7] text-sm text-[#2C1E15] font-medium outline-none focus:ring-2 focus:ring-[#2C1E15]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#786150] hover:text-[#2C1E15] cursor-pointer"
                      >
                        {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#997A15] hover:brightness-110 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account &amp; Access Bookings</span>
                </button>
              </form>

              <div className="pt-4 border-t border-[#E6D7C3]/80 flex items-center justify-between text-xs text-[#786150]">
                <span>Already have an account?</span>
                <button
                  type="button"
                  onClick={() => { setAuthMode('signin'); setAuthError(null); }}
                  className="font-bold text-[#8B6B10] hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            </div>
          )}

          {/* FORM 3: QUICK LOOKUP */}
          {authMode === 'lookup' && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E6D7C3] shadow-sm space-y-5">
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-lg text-[#2C1E15] flex items-center gap-2">
                  <Search className="w-4 h-4 text-[#8B6B10]" />
                  <span>Quick Booking Lookup</span>
                </h3>
                <p className="text-xs text-[#786150]">
                  Find your reservation immediately using your Booking Reference Number or phone.
                </p>
              </div>

              <form onSubmit={handleLookup} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-[#2C1E15] mb-1">
                    Booking Reference ID or Phone Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DV-2026-XXXX or 09175681408"
                    value={lookupRef}
                    onChange={(e) => setLookupRef(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6D7C3] bg-[#FDFBF7] text-sm text-[#2C1E15] font-medium outline-none focus:ring-2 focus:ring-[#2C1E15]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#2C1E15] hover:bg-[#3D2B1E] text-[#FAF7F2] rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <Search className="w-4 h-4 text-[#D4AF37]" />
                  <span>Lookup Reservation</span>
                </button>
              </form>

              <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E6D7C3] text-[11px] text-[#786150] space-y-1">
                <div className="font-bold text-[#2C1E15] flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-[#8B6B10]" />
                  <span>Where can I find my Booking ID?</span>
                </div>
                <p>
                  Your Booking ID starts with &ldquo;DV-2026-&rdquo; and was provided on the confirmation screen and digital receipt upon reservation.
                </p>
              </div>
            </div>
          )}


      {/* REBOOKING MODAL */}
      {rebookTarget && rebookingResults && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#FDFBF7] rounded-3xl max-w-lg w-full border-2 border-[#B8860B] shadow-2xl overflow-hidden flex flex-col my-auto text-[#2C211A]">
            <div className="bg-gradient-to-r from-[#1F140C] to-[#2C1E15] text-white p-5 px-6 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-5 h-5 text-[#E5C158]" />
                <div>
                  <span className="font-brand font-bold text-base block uppercase tracking-wider text-[#E5C158]">Modify Reservation</span>
                  <span className="text-[11px] text-[#E6D7C3]/80 font-mono">Ref: {rebookTarget.id}</span>
                </div>
              </div>
              <button
                onClick={() => setRebookTarget(null)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Rebooking Policy:</strong> Changing your stay dates incurs an additional <strong>20% rebooking fee</strong> (₱{rebookingResults.rebookingFee.toLocaleString()}) applied to the grand total.
                </p>
              </div>

              <div className="space-y-4">
                <div className="font-bold text-[#2C1E15] text-sm border-b border-[#E6D7C3] pb-1.5 flex items-center justify-between">
                  <span>Rebooking Configuration</span>
                  <span className="text-xs font-normal text-[#786150]">Update Room, Dates & Pax</span>
                </div>

                {/* Room Selection */}
                <div className="space-y-1">
                  <label className="block font-bold text-[#2C1E15]">Select Room / Unit</label>
                  <select
                    value={rebookRoomId}
                    onChange={(e) => setRebookRoomId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E6D7C3] bg-white font-medium outline-none text-xs"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title} — ₱{r.pricing?.nightly.toLocaleString()}/night
                      </option>
                    ))}
                  </select>
                </div>

                {/* Adults / Children adjustment */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-bold text-[#2C1E15]">Adult Guests</label>
                    <input
                      type="number"
                      min={1}
                      max={rebookingResults.primaryRoom.maxPax || 10}
                      value={rebookAdults}
                      onChange={(e) => setRebookAdults(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-[#E6D7C3] bg-white font-bold outline-none text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-bold text-[#2C1E15]">Child Guests</label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={rebookChildren}
                      onChange={(e) => setRebookChildren(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-[#E6D7C3] bg-white font-bold outline-none text-xs"
                    />
                  </div>
                </div>

                {rebookTarget.stayType === 'nightly' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block font-bold text-[#2C1E15]">Check-In Date</label>
                      <input
                        type="date"
                        required
                        value={rebookCheckIn}
                        onChange={(e) => setRebookCheckIn(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-[#E6D7C3] bg-white font-medium outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-bold text-[#2C1E15]">Check-Out Date</label>
                      <input
                        type="date"
                        required
                        value={rebookCheckOut}
                        onChange={(e) => setRebookCheckOut(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-[#E6D7C3] bg-white font-medium outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="block font-bold text-[#2C1E15]">Stay Date</label>
                      <input
                        type="date"
                        required
                        value={rebookHourlyDate}
                        onChange={(e) => setRebookHourlyDate(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-[#E6D7C3] bg-white font-medium outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-bold text-[#2C1E15]">Start Time</label>
                      <input
                        type="time"
                        required
                        value={rebookHourlyTime}
                        onChange={(e) => setRebookHourlyTime(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-[#E6D7C3] bg-white font-medium outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-bold text-[#2C1E15]">Duration</label>
                      <select
                        value={rebookHourlyHours}
                        onChange={(e) => setRebookHourlyHours(Number(e.target.value))}
                        className="w-full px-3 py-2.5 rounded-xl border border-[#E6D7C3] bg-white font-bold outline-none"
                      >
                        <option value={3}>3 Hours Block</option>
                        <option value={6}>6 Hours Block</option>
                        <option value={12}>12 Hours Block</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Financial Recalculation */}
                <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E6D7C3] space-y-2.5 shadow-sm">
                  <div className="flex justify-between text-[#786150]">
                    <span>Original Grand Total:</span>
                    <span className="font-mono">₱{rebookTarget.grandTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-rose-700 font-bold">
                    <span className="flex items-center gap-1">
                      Rebooking Fee (20%):
                      <Info className="w-3 h-3 cursor-help" />
                    </span>
                    <span className="font-mono">+ ₱{rebookingResults.rebookingFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[#786150]">
                    <span>New Stay Rate ({rebookingResults.nightsCount}nt):</span>
                    <span className="font-mono">₱{rebookingResults.newStayTotal.toLocaleString()}</span>
                  </div>
                  
                  <div className="pt-2 border-t border-[#E6D7C3] flex justify-between items-center text-sm font-bold text-[#2C1E15]">
                    <span>New Adjusted Total:</span>
                    <span className="text-base font-black text-amber-950 font-mono">
                      ₱{rebookingResults.newGrandTotal.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between text-emerald-800 font-medium pt-1">
                    <span>Amount Already Paid:</span>
                    <span className="font-mono">- ₱{rebookingResults.amountAlreadyPaid.toLocaleString()}</span>
                  </div>

                  <div className="pt-2 border-t border-dashed border-[#E6D7C3] flex justify-between items-center">
                    <span className="font-bold text-[#2C1E15]">New Balance at Check-In:</span>
                    <span className="text-sm font-black text-[#B8860B] font-mono bg-white px-2 py-0.5 rounded-lg border border-amber-200">
                      ₱{rebookingResults.newRemainingBalance.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#F5EBE6] p-4 px-6 border-t border-[#E6D7C3] flex gap-3">
              <button
                type="button"
                onClick={() => setRebookTarget(null)}
                className="flex-1 py-3 bg-white hover:bg-gray-100 text-[#2C1E15] text-xs font-bold rounded-xl border border-[#E6D7C3] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRebook}
                className="flex-[2] py-3 bg-gradient-to-r from-[#B8860B] to-[#997A15] hover:brightness-110 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Update Reservation</span>
              </button>
            </div>
          </div>
        </div>
      )}

        </div>
      )}

    </div>
  );
};
