import React, { useState, useMemo } from 'react';
import { RoomUnit, RoomCategory, StayType, RoomReview } from '../types';
import { getLocalDateToday, getLocalDateTomorrow } from '../utils/dateUtils';
import { 
  Users,
  BedDouble, 
  Wifi, 
  Wind, 
  Waves, 
  UtensilsCrossed, 
  Car, 
  Sparkles, 
  ChevronRight, 
  Clock, 
  Info,
  CheckCircle2,
  Lock,
  ShieldCheck,
  X,
  RotateCcw,
  Moon,
  Calendar,
  Search,
  ArrowRight,
  ChevronDown,
  Star,
  MessageSquarePlus,
  Send,
  Heart
} from 'lucide-react';
import { VillaLogo } from './VillaLogo';

const FALLBACK_ROOM_IMAGE = 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1000&q=80';

interface ExploreRoomsTabProps {
  rooms: RoomUnit[];
  reviews?: RoomReview[];
  onAddReview?: (review: RoomReview) => void;
  onSelectRoomForBooking: (roomId: string, preferredStayType?: StayType) => void;
  onOpenBookingEngine?: (params?: { roomId?: string, guests?: number, guestName?: string, checkIn?: string, checkOut?: string }) => void;
}

export const ExploreRoomsTab: React.FC<ExploreRoomsTabProps> = ({
  rooms,
  reviews = [],
  onAddReview,
  onSelectRoomForBooking,
  onOpenBookingEngine,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [stayTypePreference, setStayTypePreference] = useState<StayType>('nightly');
  
  // Today and Tomorrow default dates for the booking search bar
  const todayStr = useMemo(() => getLocalDateToday(), []);
  const tomorrowStr = useMemo(() => getLocalDateTomorrow(), []);

  const [guestType, setGuestType] = useState<'Adult' | 'Children' | 'Toddler' | 'Pwd'>('Adult');
  const [paxByGuest, setPaxByGuest] = useState<{
    Adult: number;
    Children: number;
    Toddler: number;
    Pwd: number;
  }>({
    Adult: 2,
    Children: 0,
    Toddler: 0,
    Pwd: 0,
  });
  const [summarySelection, setSummarySelection] = useState<string>('Summary');
  const [guestNameInput, setGuestNameInput] = useState<string>('');

  const guestsCount = useMemo(() => {
    const total = paxByGuest.Adult + paxByGuest.Children + paxByGuest.Toddler + paxByGuest.Pwd;
    return Math.max(1, total);
  }, [paxByGuest]);

  const multipleEntrySummary = useMemo(() => {
    const entries: string[] = [];
    if (paxByGuest.Adult > 0) entries.push(`Adult: ${paxByGuest.Adult}`);
    if (paxByGuest.Children > 0) entries.push(`Children: ${paxByGuest.Children}`);
    if (paxByGuest.Toddler > 0) entries.push(`Toddler: ${paxByGuest.Toddler}`);
    if (paxByGuest.Pwd > 0) entries.push(`Pwd: ${paxByGuest.Pwd}`);
    return entries.length > 0 ? entries.join(' • ') : 'Adult: 2';
  }, [paxByGuest]);

  const [checkInDate, setCheckInDate] = useState<string>('');
  const [checkOutDate, setCheckOutDate] = useState<string>('');

  const [activeImageIndexes, setActiveImageIndexes] = useState<{ [roomId: string]: number }>({});
  const [inspectRoom, setInspectRoom] = useState<RoomUnit | null>(null);
  // Leave Review State
  const [reviewTargetRoom, setReviewTargetRoom] = useState<RoomUnit | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewGuestName, setReviewGuestName] = useState<string>('');
  const [reviewGuestEmail, setReviewGuestEmail] = useState<string>('');
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewStayDate, setReviewStayDate] = useState<string>('');
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string>('');


  // Extract unique categories
  const categories = useMemo(() => {
    const list: string[] = ['All'];
    rooms.forEach((r) => {
      if (!list.includes(r.category)) {
        list.push(r.category);
      }
    });
    return list;
  }, [rooms]);

  // Filter rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      // Category match
      if (selectedCategory !== 'All' && room.category !== selectedCategory) {
        return false;
      }
      // Capacity match based on selected guests dropdown
      if (room.capacity.maxGuests < guestsCount) {
        return false;
      }
      return true;
    });
  }, [rooms, selectedCategory, guestsCount]);

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTargetRoom || !reviewGuestName.trim() || !reviewComment.trim()) return;

    const newRev: RoomReview = {
      id: 'REV-' + Date.now().toString().slice(-4) + Math.floor(100 + Math.random() * 900),
      roomId: reviewTargetRoom.id,
      roomTitle: reviewTargetRoom.title,
      guestName: reviewGuestName.trim(),
      guestEmail: reviewGuestEmail.trim() || undefined,
      rating: reviewRating,
      comment: reviewComment.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      stayDate: reviewStayDate.trim() || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    };

    if (onAddReview) {
      onAddReview(newRev);
    }
    setReviewSuccessMsg('Your review for ' + reviewTargetRoom.title + ' has been submitted! It is now pending screening by front desk.');
    setTimeout(() => {
      setReviewSuccessMsg('');
      setReviewTargetRoom(null);
      setReviewComment('');
      setReviewGuestName('');
      setReviewGuestEmail('');
      setReviewStayDate('');
      setReviewRating(5);
    }, 2500);
  };

  const handleCheckInChange = (newCheckIn: string) => {
    setCheckInDate(newCheckIn);
    if (newCheckIn >= checkOutDate) {
      const d = new Date(newCheckIn);
      d.setDate(d.getDate() + 1);
      setCheckOutDate(d.toISOString().split('T')[0]);
    }
  };

  const handleSearchAndBook = () => {
    if (onOpenBookingEngine) {
      onOpenBookingEngine({
        guests: guestsCount,
        guestName: guestNameInput,
        checkIn: checkInDate,
        checkOut: checkOutDate
      });
    } else if (onSelectRoomForBooking && filteredRooms.length > 0) {
      onSelectRoomForBooking(filteredRooms[0].id, 'nightly');
    }
  };

  const handleNextImage = (roomId: string, imagesCount: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (imagesCount <= 1) return;
    setActiveImageIndexes((prev) => ({
      ...prev,
      [roomId]: ((prev[roomId] || 0) + 1) % imagesCount,
    }));
  };

  const getAmenityIcon = (amenityText: string) => {
    const text = amenityText.toLowerCase();
    if (text.includes('pool')) return <Waves className="w-3.5 h-3.5 text-[#D4AF37]" />;
    if (text.includes('aircon') || text.includes('ac')) return <Wind className="w-3.5 h-3.5 text-[#8B6B10]" />;
    if (text.includes('private cr') || text.includes('cr')) return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />;
    if (text.includes('wi-fi') || text.includes('wifi')) return <Wifi className="w-3.5 h-3.5 text-amber-600" />;
    if (text.includes('parking')) return <Car className="w-3.5 h-3.5 text-[#8B6B10]" />;
    if (text.includes('kitchen')) return <UtensilsCrossed className="w-3.5 h-3.5 text-amber-800" />;
    if (text.includes('billard') || text.includes('darts')) return <Sparkles className="w-3.5 h-3.5 text-amber-600" />;
    if (text.includes('cctv')) return <ShieldCheck className="w-3.5 h-3.5 text-amber-800" />;
    if (text.includes('double lock') || text.includes('door')) return <Lock className="w-3.5 h-3.5 text-[#3D2616]" />;
    return <CheckCircle2 className="w-3.5 h-3.5 text-[#8B6B10]" />;
  };

  const getCategoryCount = (categoryName: string) => {
    if (categoryName === 'All') return rooms.length;
    return rooms.filter((r) => r.category === categoryName).length;
  };

  return (
    <div className="space-y-10">
      
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#D4AF37]/20 to-[#B8860B]/20 border border-[#E6D7C3] px-4 py-1.5 rounded-full text-xs font-bold text-[#8B6B10] uppercase tracking-[0.18em] shadow-xs">
          <VillaLogo size={18} variant="gold" />
          <span className="font-monogram">Accommodations &amp; Private Suites</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#2C1E15] tracking-tight">
          Explore Rooms &amp; Private Villa Units
        </h2>
        <p className="text-sm sm:text-base text-[#6E5544] leading-relaxed">
          Standard amenities included in all units (Aircon, Private CR, Wi-Fi, Wide Parking, Common Kitchen, Billiards/Darts, 24HR CCTV, Pet Allowed, Double Lock Doors) plus exclusive private swimming pool for our Private Villa.
        </p>
      </div>

      {/* Modern Booking Search Banner (Guests Dropdown + Check-in + Check-out + Search Button) */}
      <div className="bg-gradient-to-br from-white via-[#FAF7F2] to-white border-2 border-[#D4AF37]/60 rounded-3xl p-5 sm:p-7 shadow-xl shadow-amber-950/5 relative backdrop-blur-md">
        {/* Subtle decorative gold sheen glow */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#D4AF37]/10 via-[#B8860B]/5 to-transparent rounded-full blur-2xl" />
        </div>

        <div className="relative z-10 space-y-4">
          {/* Search Inputs Grid: Guest, Pax, check-in, check-out, summary button, and Book Button */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
            
            {/* 1. Guest Dropdown */}
            <div className="lg:col-span-2 space-y-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#2C1E15] flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[#B8860B]" />
                <span>Guest</span>
              </label>
              <div className="relative">
                <select
                  value={guestType}
                  onChange={(e) => setGuestType(e.target.value as 'Adult' | 'Children' | 'Toddler' | 'Pwd')}
                  className="w-full appearance-none bg-white border border-[#D4AF37]/70 rounded-xl px-3 py-1.5 text-xs font-bold text-[#2C1E15] shadow-xs focus:ring-2 focus:ring-[#D4AF37] focus:border-[#B8860B] outline-hidden cursor-pointer pr-8"
                >
                  <option value="Adult">Adult</option>
                  <option value="Children">Children</option>
                  <option value="Toddler">Toddler</option>
                  <option value="Pwd">Pwd</option>
                </select>
                <ChevronDown className="w-3 h-3 text-[#8B6B10] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 2. Pax (- and + input) */}
            <div className="lg:col-span-2 space-y-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#2C1E15] flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <BedDouble className="w-3.5 h-3.5 text-[#B8860B]" />
                  <span>Pax</span>
                </span>
                <span className="text-[9px] text-[#8B6B10] font-semibold">({guestType})</span>
              </label>
              <div className="flex items-center justify-between bg-white border border-[#D4AF37]/70 rounded-xl px-2 py-1 text-xs font-bold text-[#2C1E15] shadow-xs">
                <button
                  type="button"
                  onClick={() =>
                    setPaxByGuest((prev) => ({
                      ...prev,
                      [guestType]: Math.max(guestType === 'Adult' ? 1 : 0, (prev[guestType] ?? 0) - 1),
                    }))
                  }
                  className="w-5 h-5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold flex items-center justify-center cursor-pointer"
                >
                  -
                </button>
                <span>{paxByGuest[guestType] ?? 0}</span>
                <button
                  type="button"
                  onClick={() =>
                    setPaxByGuest((prev) => ({
                      ...prev,
                      [guestType]: (prev[guestType] ?? 0) + 1,
                    }))
                  }
                  className="w-5 h-5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold flex items-center justify-center cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* 3. Check-In */}
            <div className="lg:col-span-2 space-y-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#2C1E15] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#B8860B]" />
                <span>check-in</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  min={todayStr}
                  value={checkInDate}
                  onChange={(e) => handleCheckInChange(e.target.value)}
                  className="w-full bg-white border border-[#D4AF37]/70 rounded-xl px-3 py-1.5 text-xs font-bold text-[#2C1E15] shadow-xs focus:ring-2 focus:ring-[#D4AF37] focus:border-[#B8860B] outline-hidden cursor-pointer"
                />
              </div>
            </div>

            {/* 4. Check-Out */}
            <div className="lg:col-span-2 space-y-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#2C1E15] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#B8860B]" />
                <span>check-out</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  min={checkInDate || todayStr}
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  className="w-full bg-white border border-[#D4AF37]/70 rounded-xl px-3 py-1.5 text-xs font-bold text-[#2C1E15] shadow-xs focus:ring-2 focus:ring-[#D4AF37] focus:border-[#B8860B] outline-hidden cursor-pointer"
                />
              </div>
            </div>

            {/* 5. Summary Drop Down Menu to show guest and pax entry */}
            <div className="lg:col-span-2 space-y-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#2C1E15] flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#B8860B]" />
                  <span>Summary</span>
                </span>
                <span className="text-[9px] text-[#8B6B10] font-bold">{guestsCount} Pax</span>
              </label>
              <div className="relative">
                <select
                  value={summarySelection}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSummarySelection(val);
                    if (val === 'Adult' || val === 'Children' || val === 'Toddler' || val === 'Pwd') {
                      setGuestType(val as 'Adult' | 'Children' | 'Toddler' | 'Pwd');
                    }
                  }}
                  className="w-full appearance-none bg-white border border-[#D4AF37]/70 rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#2C1E15] shadow-xs focus:ring-2 focus:ring-[#D4AF37] focus:border-[#B8860B] outline-hidden cursor-pointer pr-8 truncate"
                >
                  <option value="Summary">
                    Summary: {guestsCount} Total Pax ({multipleEntrySummary})
                  </option>
                  <option value="Adult">
                    Guest: Adult — Pax: {paxByGuest.Adult}
                  </option>
                  <option value="Children">
                    Guest: Children — Pax: {paxByGuest.Children}
                  </option>
                  <option value="Toddler">
                    Guest: Toddler (0-4 yrs free without Bed) — Pax: {paxByGuest.Toddler}
                  </option>
                  <option value="Pwd">
                    Guest: PWD (confirmation ID upon Check-in) — Pax: {paxByGuest.Pwd}
                  </option>
                </select>
                <ChevronDown className="w-3 h-3 text-[#8B6B10] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 6. Book Button */}
            <div className="lg:col-span-2">
              <button
                type="button"
                onClick={handleSearchAndBook}
                className="w-full py-2 px-3 bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#B8860B] hover:brightness-110 active:scale-95 text-[#1C120B] rounded-xl text-xs font-black shadow-md shadow-amber-500/20 transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 group"
              >
                <Search className="w-3.5 h-3.5 text-[#1C120B] group-hover:scale-110 transition-transform" />
                <span>Book</span>
              </button>
            </div>

          </div>

          {/* Bottom Filter Chips & Available Count */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-[#786150]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-[#2C1E15] text-[11px] uppercase mr-1">Categories:</span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#2C1E15] text-amber-200 shadow-xs'
                      : 'bg-white hover:bg-amber-50 text-[#5C4534] border border-[#E6D7C3]'
                  }`}
                >
                  {cat} ({getCategoryCount(cat)})
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px]">
                Showing <strong className="text-[#2C1E15] font-black">{filteredRooms.length}</strong> available units for <strong>{guestsCount} Guests</strong>
              </span>
              {(selectedCategory !== 'All' || guestsCount !== 2) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('All');
                    setGuestType('Adult');
                    setPaxByGuest({ Adult: 2, Children: 0, Toddler: 0, Pwd: 0 });
                    setGuestNameInput('');
                    setSummarySelection('Summary');
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Room Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
        {filteredRooms.map((room) => {
          const roomImages = Array.isArray(room.images) && room.images.length > 0 ? room.images : [FALLBACK_ROOM_IMAGE];
          const activeImgIdx = (activeImageIndexes[room.id] || 0) % roomImages.length;
          const currentImg = roomImages[activeImgIdx] || roomImages[0] || FALLBACK_ROOM_IMAGE;

          return (
            <div
              key={room.id}
              className="group bg-white rounded-3xl border border-[#E6D7C3] overflow-hidden shadow-lg hover:shadow-2xl hover:border-[#D4AF37] transition-all duration-300 flex flex-col justify-between"
            >
              {/* Image Section */}
              <div 
                onClick={(e) => {
                  if (roomImages.length > 1) {
                    handleNextImage(room.id, roomImages.length, e);
                  }
                }}
                className={`relative aspect-[4/3] overflow-hidden bg-stone-200 ${
                  roomImages.length > 1 ? 'cursor-pointer' : ''
                }`}
                title={roomImages.length > 1 ? 'Click to cycle room photos' : undefined}
              >
                <img
                  src={currentImg}
                  alt={room.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== FALLBACK_ROOM_IMAGE) {
                      target.src = FALLBACK_ROOM_IMAGE;
                    }
                  }}
                />

                {/* Room Number Badge (Top-Left) with Gold Frame */}
                <div className="absolute top-3.5 left-3.5 bg-[#1F140C]/90 backdrop-blur-md text-[#FFF2CC] border border-[#D4AF37]/50 px-3.5 py-1 rounded-full text-xs font-bold tracking-wider shadow-md flex items-center gap-1.5 font-monogram">
                  <span className="w-2 h-2 rounded-full bg-[#E5C158] animate-pulse"></span>
                  <span>{room.roomNumber || room.title}</span>
                </div>

                {/* Capacity Pill (Top-Right) */}
                <div className="absolute top-3.5 right-3.5 bg-black/65 backdrop-blur-md text-[#FFFDF7] border border-white/20 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#E5C158]" />
                  <span>{room.capacity.recommended}</span>
                </div>

                {/* Multi-image thumbnail stepper */}
                {roomImages.length > 1 && (
                  <button
                    onClick={(e) => handleNextImage(room.id, roomImages.length, e)}
                    className="absolute bottom-3 right-3 bg-white/90 hover:bg-white text-[#2C1E15] px-2.5 py-1 rounded-xl text-[11px] font-bold backdrop-blur-sm shadow-md transition-colors cursor-pointer border border-[#E6D7C3]"
                  >
                    Photo {activeImgIdx + 1}/{roomImages.length} ↻
                  </button>
                )}

                {/* Category Pill (Bottom-Left) */}
                <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm text-[#2C1E15] px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm border border-[#E6D7C3]">
                  <span>{room.category}</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                
                {/* Title & Subtitle */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-serif font-bold text-lg sm:text-xl text-[#2C1E15] group-hover:text-[#8B6B10] transition-colors leading-snug">
                      {room.title}
                    </h3>
                    {(() => {
                      const roomReviews = reviews.filter((r) => r.roomId === room.id && r.status === 'approved');
                      if (roomReviews.length === 0) return null;
                      const avgRating = (roomReviews.reduce((sum, r) => sum + r.rating, 0) / roomReviews.length).toFixed(1);
                      return (
                        <div className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md text-[11px] font-bold text-amber-900 shrink-0">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span>{avgRating}</span>
                          <span className="text-[#786150] font-normal">({roomReviews.length})</span>
                        </div>
                      );
                    })()}
                  </div>
                  <p className="text-xs font-semibold text-[#8B6B10] mt-0.5">
                    {room.subtitle}
                  </p>
                  {/* Bed Configuration Chip on Room Card */}
                  <div className="flex items-center gap-1.5 text-xs text-[#523A2A] font-medium mt-2 bg-[#FAF7F2] border border-[#E6D7C3]/80 px-2.5 py-1.5 rounded-xl shadow-2xs">
                    <BedDouble className="w-3.5 h-3.5 text-[#B8860B] shrink-0" />
                    <span className="font-semibold text-[#8B6B10]">Beds:</span>
                    <span className="line-clamp-1 text-[#2C1E15] font-medium">{room.beds}</span>
                  </div>
                  <p className="text-xs text-[#4A3222]/85 mt-2 line-clamp-2 leading-relaxed">
                    {room.description}
                  </p>
                </div>

                {/* Standard Amenities List Chips */}
                <div className="flex flex-wrap gap-1.5 text-[11px] text-[#4A3222]">
                  {room.amenities.slice(0, 5).map((amenity, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg border ${
                        amenity.includes('Swimming Pool') 
                          ? 'bg-amber-50/80 border-[#D4AF37] text-[#8B6B10] font-bold' 
                          : 'bg-[#FAF7F2] border-[#E6D7C3]/70'
                      }`}
                    >
                      {getAmenityIcon(amenity)}
                      <span>{amenity}</span>
                    </div>
                  ))}
                  {room.amenities.length > 5 && (
                    <span className="px-2 py-1 rounded-lg bg-[#FAF7F2] text-[#7A604D] text-[10px] font-semibold flex items-center border border-[#E6D7C3]/50">
                      +{room.amenities.length - 5} more
                    </span>
                  )}
                </div>

                {/* Card Action Buttons: View Details, Leave Review, Book Room */}
                <div className="space-y-1.5 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setInspectRoom(room)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#E6D7C3] text-[#2C1E15] hover:bg-[#FAF7F2] text-xs font-bold transition-all cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5 text-[#7A604D]" />
                      <span>Details & Reviews</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setReviewTargetRoom(room);
                        setReviewRating(5);
                        setReviewComment('');
                      }}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#D4AF37]/60 bg-amber-50/70 hover:bg-amber-100/80 text-[#8B6B10] text-xs font-bold transition-all cursor-pointer shadow-2xs"
                      title="Leave a guest review for this room"
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5 text-[#B8860B]" />
                      <span>Leave Review</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectRoomForBooking(room.id, stayTypePreference)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#997A15] hover:from-[#A67908] hover:to-[#B8860B] text-white text-xs font-bold transition-all cursor-pointer shadow-md group-hover:shadow-lg border border-white/20 active:scale-95"
                  >
                    <span>Book {room.roomNumber || 'Room'}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#FFFDF7]" />
                  </button>
                </div>

              </div>

            </div>
          );
        })}
      </div>

      {filteredRooms.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-[#E6D7C3] p-8 space-y-3">
          <VillaLogo size={40} variant="gold" className="mx-auto" />
          <h3 className="font-serif font-bold text-xl text-[#2C1E15]">No Rooms Match Your Current Filters</h3>
          <p className="text-sm text-[#6E5544] max-w-md mx-auto">
            Try adjusting your guest capacity requirement to view available units.
          </p>
          <button
            onClick={() => {
              setSelectedCategory('All');
              setGuestType('Adult');
              setPaxByGuest({ Adult: 2, Children: 0, Toddler: 0, Pwd: 0 });
              setGuestNameInput('');
            }}
            className="px-5 py-2.5 bg-[#1F140C] text-white text-xs font-bold rounded-xl mt-2 cursor-pointer shadow-md"
          >
            Reset All Filters
          </button>
        </div>
      )}


      {/* Leave Room Review Modal */}
      {reviewTargetRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#FAF7F2] rounded-3xl max-w-lg w-full border border-[#E6D7C3] shadow-2xl p-6 sm:p-7 space-y-5 relative">
            <button
              type="button"
              onClick={() => {
                setReviewTargetRoom(null);
                setReviewSuccessMsg('');
              }}
              className="absolute top-4 right-4 p-2 rounded-full bg-[#E6D7C3]/50 hover:bg-[#E6D7C3] text-[#2C1E15] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Title */}
            <div>
              <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border border-amber-300">
                <MessageSquarePlus className="w-3.5 h-3.5 text-[#B8860B]" />
                <span>Guest Room Review</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#2C1E15]">
                Review {reviewTargetRoom.title}
              </h3>
              <p className="text-xs text-[#6E5544] mt-0.5">
                Share your authentic stay experience. Reviews are screened by front desk staff before publishing.
              </p>
            </div>

            {reviewSuccessMsg ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-sm text-emerald-900">Review Submitted Successfully!</h4>
                <p className="text-xs text-emerald-800">{reviewSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                {/* Rating Stepper */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#2C1E15]">
                    Your Rating <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2 p-2.5 bg-white rounded-2xl border border-[#E6D7C3]">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="p-1 hover:scale-125 transition-transform cursor-pointer"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= reviewRating
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-xs font-bold text-[#8B6B10]">
                      {reviewRating === 5
                        ? '5.0 — Outstanding / Highly Recommended'
                        : reviewRating === 4
                        ? '4.0 — Very Good Stay'
                        : reviewRating === 3
                        ? '3.0 — Satisfactory'
                        : reviewRating === 2
                        ? '2.0 — Needs Improvement'
                        : '1.0 — Poor Experience'}
                    </span>
                  </div>
                </div>

                {/* Guest Name & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-[#2C1E15]">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Maria Santos"
                      value={reviewGuestName}
                      onChange={(e) => setReviewGuestName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#E6D7C3] bg-white text-xs text-[#2C1E15] outline-none focus:ring-2 focus:ring-[#D4AF37]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-[#2C1E15]">
                      Email or Phone (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. maria@gmail.com"
                      value={reviewGuestEmail}
                      onChange={(e) => setReviewGuestEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#E6D7C3] bg-white text-xs text-[#2C1E15] outline-none focus:ring-2 focus:ring-[#D4AF37]"
                    />
                  </div>
                </div>

                {/* Month of Stay */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#2C1E15]">
                    Month / Year of Stay (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. October 2026, Weekend Getaway"
                    value={reviewStayDate}
                    onChange={(e) => setReviewStayDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6D7C3] bg-white text-xs text-[#2C1E15] outline-none focus:ring-2 focus:ring-[#D4AF37]"
                  />
                </div>

                {/* Review Text */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#2C1E15]">
                    Your Feedback & Review <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe the room cleanliness, comfort, amenities, customer service, or quietness..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6D7C3] bg-white text-xs text-[#2C1E15] outline-none focus:ring-2 focus:ring-[#D4AF37]"
                  />
                </div>

                {/* Buttons */}
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#E6D7C3]">
                  <button
                    type="button"
                    onClick={() => setReviewTargetRoom(null)}
                    className="px-4 py-2.5 bg-white border border-[#E6D7C3] text-[#2C1E15] font-bold rounded-xl text-xs hover:bg-[#FAF7F2] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#997A15] text-white font-bold rounded-xl text-xs shadow-md cursor-pointer flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Review for Screening</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Room Details Modal */}
      {inspectRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#FAF7F2] rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#E6D7C3] shadow-2xl p-6 sm:p-8 space-y-6 relative">
            <button
              onClick={() => setInspectRoom(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-[#E6D7C3]/50 hover:bg-[#E6D7C3] text-[#2C1E15] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div>
              <div className="inline-flex items-center gap-2 bg-[#E6D7C3]/60 text-[#8B6B10] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border border-[#E6D7C3]">
                {inspectRoom.category}
              </div>
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-[#2C1E15]">
                {inspectRoom.title}
              </h3>
              <p className="text-sm text-[#6E5544]">{inspectRoom.subtitle}</p>
            </div>

            {/* Image Gallery */}
            <div className={`grid gap-2 rounded-2xl overflow-hidden border border-[#E6D7C3] ${(inspectRoom.images?.length || 1) === 1 ? 'grid-cols-1' : inspectRoom.images?.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2'}`}>
              {(Array.isArray(inspectRoom.images) && inspectRoom.images.length > 0 ? inspectRoom.images : [FALLBACK_ROOM_IMAGE]).map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`${inspectRoom.title} photo ${i + 1}`}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== FALLBACK_ROOM_IMAGE) {
                      target.src = FALLBACK_ROOM_IMAGE;
                    }
                  }}
                  className={`w-full object-cover hover:scale-105 transition-transform ${(inspectRoom.images?.length === 3 && i === 0) ? 'sm:col-span-3 h-52' : inspectRoom.images?.length === 3 ? 'h-32' : 'h-40'}`}
                />
              ))}
            </div>

            {/* Key Specs & Pricing Info */}
            <div className="space-y-3">
              {inspectRoom.id === 'private-villa-pool' && (
                <div className="bg-gradient-to-r from-amber-500 to-[#B8860B] text-white p-3.5 rounded-2xl shadow-md flex items-center gap-3">
                  <Waves className="w-6 h-6 shrink-0 text-[#FFF2CC] animate-pulse" />
                  <div>
                    <div className="font-serif font-bold text-sm">Exclusive Private Swimming Pool</div>
                    <div className="text-[11px] text-amber-100">Included exclusively for your group of up to 20 guests.</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-white rounded-2xl border border-[#E6D7C3] text-center">
                <div>
                  <div className="text-[11px] text-[#6E5544] font-semibold">Unit Number</div>
                  <div className="text-xs font-bold text-[#2C1E15] mt-0.5">{inspectRoom.roomNumber || inspectRoom.roomNumbers.join(', ')}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#6E5544] font-semibold">Capacity</div>
                  <div className="text-xs font-bold text-[#2C1E15] mt-0.5">{inspectRoom.capacity.recommended}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#6E5544] font-semibold">Beds Configuration</div>
                  <div className="text-xs font-bold text-[#2C1E15] mt-0.5 line-clamp-2" title={inspectRoom.beds}>{inspectRoom.beds}</div>
                </div>
              </div>

              {/* Rate & Pricing Box */}
              <div className="p-4 bg-gradient-to-r from-amber-50/90 to-amber-100/60 rounded-2xl border border-[#D4AF37]/40 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#8B6B10] border-b border-[#D4AF37]/30 pb-2">
                  <span>Stay Rates &amp; Tariffs</span>
                  <span className="font-mono bg-white/80 px-2 py-0.5 rounded-md border border-[#D4AF37]/30">
                    {inspectRoom.id === 'private-villa-pool' ? 'Exclusive Pool Villa' : inspectRoom.category}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between items-center bg-white/80 p-2 rounded-xl border border-[#E6D7C3]">
                    <span className="text-[#6E5544]">Sunday to Thursday Rate (Sun–Thu):</span>
                    <span className="font-bold text-[#2C1E15]">{inspectRoom.weekdayRateDisplay}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/80 p-2 rounded-xl border border-[#E6D7C3]">
                    <span className="text-[#6E5544]">Friday to Saturday Rate (Fri–Sat):</span>
                    <span className="font-bold text-[#8B6B10]">{inspectRoom.weekendRateDisplay}</span>
                  </div>
                </div>
                {inspectRoom.pricing.hourly3hr && (
                  <div className="flex items-center justify-between bg-white/60 px-3 py-1.5 rounded-xl border border-[#E6D7C3]/60 text-[11px]">
                    <span className="text-[#6E5544]">Short Stay Options:</span>
                    <span className="font-semibold text-[#2C1E15]">
                      3hr: ₱{inspectRoom.pricing.hourly3hr} | 6hr: ₱{inspectRoom.pricing.hourly6hr} | 12hr: ₱{inspectRoom.pricing.hourly12hr}
                    </span>
                  </div>
                )}
                  {inspectRoom.id === 'private-villa-pool' ? (
                    inspectRoom.extraPaxFee && (
                      <div className="text-[11px] text-[#8B6B10] font-semibold pt-1">
                        * Additional pax fee: ₱{inspectRoom.extraPaxFee} per head beyond base occupancy (10 pax).
                      </div>
                    )
                  ) : (
                    <div className="text-[11px] text-[#8B6B10] font-semibold pt-1 bg-amber-50/60 p-2 rounded-lg border border-[#D4AF37]/30 space-y-0.5">
                      <div className="font-bold text-[#2C1E15]">👶 Additional Pax Policy (Rooms 0–13 &amp; 14–16):</div>
                      <div className="text-[#6E5544]">
                        • <strong className="text-emerald-700">1–5 yrs:</strong> FREE (₱0)
                      </div>
                      <div className="text-[#6E5544]">
                        • <strong className="text-[#8B6B10]">6–10 yrs:</strong> ₱200/pax (Sun to Thu) | ₱250/pax (Fri to Sat)
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* Included Amenities Full List */}
            <div className="space-y-2">
              <h4 className="font-serif font-bold text-base text-[#2C1E15]">
                Room &amp; Property Amenities
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {inspectRoom.amenities.map((amenity, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-white border border-[#E6D7C3] text-xs text-[#2C1E15]">
                    {getAmenityIcon(amenity)}
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Guest Reviews Section for this Room */}
            <div className="space-y-3 pt-2 border-t border-[#E6D7C3]/60">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-serif font-bold text-base text-[#2C1E15] flex items-center gap-2">
                    <span>Verified Guest Reviews</span>
                    {(() => {
                      const approved = reviews.filter((r) => r.roomId === inspectRoom.id && r.status === 'approved');
                      if (approved.length === 0) return null;
                      const avg = (approved.reduce((s, r) => s + r.rating, 0) / approved.length).toFixed(1);
                      return (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 text-xs px-2 py-0.5 rounded-full font-bold border border-amber-300">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span>{avg} / 5.0</span>
                        </span>
                      );
                    })()}
                  </h4>
                  <p className="text-xs text-[#786150]">Screened & approved reviews from verified stays at {inspectRoom.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setReviewTargetRoom(inspectRoom);
                    setReviewRating(5);
                    setReviewComment('');
                  }}
                  className="px-3.5 py-1.5 rounded-xl border border-[#D4AF37] bg-gradient-to-r from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200 text-[#8B6B10] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5 text-[#B8860B]" />
                  <span>Write a Review</span>
                </button>
              </div>

              {(() => {
                const roomApprovedReviews = reviews.filter((r) => r.roomId === inspectRoom.id && r.status === 'approved');
                if (roomApprovedReviews.length === 0) {
                  return (
                    <div className="p-5 bg-white rounded-2xl border border-dashed border-[#E6D7C3] text-center space-y-2">
                      <p className="text-xs text-[#786150]">No guest reviews published yet for this room.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setReviewTargetRoom(inspectRoom);
                          setReviewRating(5);
                          setReviewComment('');
                        }}
                        className="text-xs font-bold text-[#8B6B10] hover:underline cursor-pointer"
                      >
                        Be the first to share your experience!
                      </button>
                    </div>
                  );
                }
                return (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {roomApprovedReviews.map((rev) => (
                      <div key={rev.id} className="p-3.5 bg-white rounded-2xl border border-[#E6D7C3]/80 shadow-2xs space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#2C1E15]">{rev.guestName}</span>
                            {rev.stayDate && (
                              <span className="text-[10px] text-[#786150] bg-[#FAF7F2] px-2 py-0.5 rounded border border-[#E6D7C3]/60">
                                Stayed {rev.stayDate}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3 h-3 ${star <= rev.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-[#4A3222] leading-relaxed italic">&ldquo;{rev.comment}&rdquo;</p>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Modal Bottom CTA */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#E6D7C3]">
              <button
                type="button"
                onClick={() => setInspectRoom(null)}
                className="px-4 py-2.5 bg-white border border-[#E6D7C3] text-[#2C1E15] font-bold rounded-xl text-xs hover:bg-[#FAF7F2] transition-colors cursor-pointer"
              >
                Close Details
              </button>
              <button
                type="button"
                onClick={() => {
                  const roomId = inspectRoom.id;
                  setInspectRoom(null);
                  onSelectRoomForBooking(roomId, stayTypePreference);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#997A15] text-white font-bold rounded-xl text-xs shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <span>Book This Room</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
