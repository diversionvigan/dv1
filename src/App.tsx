import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { ExploreRoomsTab } from './components/ExploreRoomsTab';
import { PrivateVillaTab } from './components/PrivateVillaTab';
import { BookingEngineTab } from './components/BookingEngineTab';
import { MyBookingsTab } from './components/MyBookingsTab';
import { ContactTab } from './components/ContactTab';
import { AdminDeskTab } from './components/AdminDeskTab';
import { VoucherModal } from './components/VoucherModal';
import { SlipLightboxModal } from './components/SlipLightboxModal';
import { Footer } from './components/Footer';
import { GuestLiveChatWidget } from './components/GuestLiveChatWidget';
import { FloatingBackToHomeWidget } from './components/FloatingBackToHomeWidget';
import { ROOMS_DATA, AVAILABLE_ADDONS, INITIAL_BOOKINGS } from './data/roomsData';
import { BookingRecord, BookingStatus, StayType, NavigationTab, RoomUnit, BookingAddonItem, InquiryRecord, RoomReview, ReviewStatus } from './types';
import { CheckCircle2, RefreshCw, Sparkles, X } from 'lucide-react';

export default function App() {
  // Navigation active tab - strictly 'explore' | 'contact' | 'admin'
  const [activeTab, setActiveTab] = useState<NavigationTab>('explore');
  const [sectionKey, setSectionKey] = useState<number>(1);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isServerConnected, setIsServerConnected] = useState<boolean>(true);

  // Selected room for reservation engine (displayed when estimating or booking)
  const [selectedBookingUnit, setSelectedBookingUnit] = useState<{
    roomId?: string;
    stayType: StayType;
    guests?: number;
    checkIn?: string;
    checkOut?: string;
  } | null>(null);

  // Persistent bookings state
  const [bookings, setBookings] = useState<BookingRecord[]>(() => {
    try {
      const saved = localStorage.getItem('diversion_vigan_bookings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return [];
  });

  // Guest Inquiries state
  const [inquiries, setInquiries] = useState<InquiryRecord[]>(() => {
    try {
      const saved = localStorage.getItem('diversion_vigan_inquiries');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Rooms inventory & custom add-ons state synchronized with admin inventory console
  const [rooms, setRooms] = useState<RoomUnit[]>(() => {
    try {
      const version = localStorage.getItem('diversion_room_capacity_version');
      if (version === 'v25') {
        const saved = localStorage.getItem('diversion_admin_inventory_rooms');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } else {
        localStorage.removeItem('diversion_admin_inventory_rooms');
        localStorage.setItem('diversion_room_capacity_version', 'v25');
      }
    } catch {}
    return ROOMS_DATA;
  });

  const [availableAddons, setAvailableAddons] = useState<BookingAddonItem[]>(() => {
    try {
      const saved = localStorage.getItem('diversion_admin_custom_addons');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const defaultIds = AVAILABLE_ADDONS.map((a) => a.id);
          const customOnly = parsed.filter((a: BookingAddonItem) => !defaultIds.includes(a.id));
          return [...AVAILABLE_ADDONS, ...customOnly];
        }
      }
    } catch {}
    return AVAILABLE_ADDONS;
  });

  useEffect(() => {
    localStorage.setItem('diversion_admin_inventory_rooms', JSON.stringify(rooms));
  }, [rooms]);

  useEffect(() => {
    localStorage.setItem('diversion_admin_custom_addons', JSON.stringify(availableAddons));
  }, [availableAddons]);

  useEffect(() => {
    localStorage.setItem('diversion_vigan_bookings', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem('diversion_vigan_inquiries', JSON.stringify(inquiries));
  }, [inquiries]);

  // Admin session state - strictly in-memory session (resets on section exit)
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);

  // Modals
  const [activeVoucherBooking, setActiveVoucherBooking] = useState<BookingRecord | null>(null);
  const [lightboxSlipBooking, setLightboxSlipBooking] = useState<BookingRecord | null>(null);
  const [showEnjoyStayPopup, setShowEnjoyStayPopup] = useState<boolean>(false);

  // Room Reviews State (synchronized with backend & localStorage)
  const [reviews, setReviews] = useState<RoomReview[]>(() => {
    try {
      const saved = localStorage.getItem('diversion_vigan_reviews');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    localStorage.setItem('diversion_vigan_reviews', JSON.stringify(reviews));
  }, [reviews]);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Fetch live bookings, inquiries, and room inventory from backend server
  const syncWithServer = useCallback(async (silent: boolean = false) => {
    if (!silent) setIsSyncing(true);
    try {
      const [bookingsRes, inquiriesRes, roomsRes, reviewsRes] = await Promise.allSettled([
        fetch('/api/bookings'),
        fetch('/api/inquiries'),
        fetch(`/api/rooms?t=${Date.now()}`, { 
          cache: 'no-store', 
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } 
        }),
        fetch('/api/reviews'),
      ]);

      let syncSuccess = false;

      if (bookingsRes.status === 'fulfilled' && bookingsRes.value.ok) {
        const bJson = await bookingsRes.value.json();
        if (bJson.success && Array.isArray(bJson.data)) {
          setBookings(bJson.data);
          syncSuccess = true;
        }
      }

      if (inquiriesRes.status === 'fulfilled' && inquiriesRes.value.ok) {
        const inqJson = await inquiriesRes.value.json();
        if (inqJson.success && Array.isArray(inqJson.data)) {
          setInquiries(inqJson.data);
        }
      }

      if (reviewsRes.status === 'fulfilled' && reviewsRes.value.ok) {
        const revJson = await reviewsRes.value.json();
        if (revJson.success && Array.isArray(revJson.data)) {
          setReviews(revJson.data);
        }
      }

      if (roomsRes.status === 'fulfilled' && roomsRes.value.ok) {
        const rJson = await roomsRes.value.json();
        if (rJson.success && Array.isArray(rJson.data) && rJson.data.length > 0) {
          setRooms((prev) => {
            const serverMap = new Map<string, RoomUnit>(rJson.data.map((r: RoomUnit) => [String(r.id), r]));
            const updated = prev.map((localRoom) => {
              const serverRoom = serverMap.get(String(localRoom.id));
              if (serverRoom) {
                return {
                  ...localRoom,
                  ...serverRoom,
                  images: serverRoom.images && serverRoom.images.length > 0 ? serverRoom.images : localRoom.images,
                  pricing: serverRoom.pricing || localRoom.pricing,
                  paxRates: serverRoom.paxRates || localRoom.paxRates,
                };
              }
              return localRoom;
            });
            // Also append any new rooms from server
            rJson.data.forEach((sr: RoomUnit) => {
              if (!prev.some((pr) => String(pr.id) === String(sr.id))) {
                updated.push(sr);
              }
            });
            try {
              localStorage.setItem('diversion_admin_inventory_rooms', JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }
      }

      setIsServerConnected(true);
      if (!silent && syncSuccess) {
        showToast('Real-time bookings synchronized with server.', 'info');
      }
    } catch (err) {
      console.warn('Backend sync failed, using offline cache:', err);
      setIsServerConnected(false);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  }, []);

  // Initial mount sync + periodic polling every 15 seconds
  useEffect(() => {
    syncWithServer(true);
    const interval = setInterval(() => {
      syncWithServer(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [syncWithServer]);

  /**
   * Universal Section Switcher & Cache Reset
   */
  const handleNavigateSection = useCallback((newTab: NavigationTab) => {
    if (activeTab === 'admin' || newTab !== 'admin') {
      setIsAdminLoggedIn(false);
      try {
        localStorage.removeItem('diversion_admin_session');
        sessionStorage.clear();
      } catch {}
    }

    try {
      if (window.location.hash === '#book-now' || window.location.hash === '#booking-engine') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } catch {}
    setSelectedBookingUnit(null);
    setActiveVoucherBooking(null);
    setLightboxSlipBooking(null);
    setSectionKey((prev) => prev + 1);
    setActiveTab(newTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  const handleOpenBookingEngine = useCallback((searchParams?: { roomId?: string, guests?: number, checkIn?: string, checkOut?: string }) => {
    try {
      if (window.location.hash !== '#book-now') {
        window.history.replaceState(null, '', '#book-now');
      }
    } catch {}
    setSelectedBookingUnit({
      roomId: searchParams?.roomId,
      stayType: 'nightly',
      guests: searchParams?.guests,
      checkIn: searchParams?.checkIn,
      checkOut: searchParams?.checkOut,
    });
    setActiveTab('explore');
    setShowEnjoyStayPopup(true);
    window.scrollTo({ top: 100, behavior: 'smooth' });
  }, []);

  // Handle direct url hash '#book-now' on page load or hash change
  useEffect(() => {
    const handleCheckHash = () => {
      if (window.location.hash === '#book-now' || window.location.hash === '#booking-engine') {
        handleOpenBookingEngine();
      }
    };
    handleCheckHash();
    window.addEventListener('hashchange', handleCheckHash);
    return () => window.removeEventListener('hashchange', handleCheckHash);
  }, [handleOpenBookingEngine]);

  const handleSelectRoomForBooking = useCallback((roomId: string, stayType: StayType = 'nightly') => {
    setSelectedBookingUnit({ roomId, stayType });
    setActiveTab('explore');
    window.scrollTo({ top: 100, behavior: 'smooth' });
    showToast('Room selected! Complete your reservation details.', 'info');
  }, []);

  // Handle new booking created from Booking Engine
  const handleBookingCreated = useCallback(async (newBooking: BookingRecord) => {
    // 1. Optimistic update in UI & Automatic Guest Account Registration
    try {
      const guestAccount = {
        name: newBooking.guestName,
        phone: newBooking.guestPhone,
        email: newBooking.guestEmail || '',
        registeredAt: newBooking.createdAt,
        lastBookingId: newBooking.id,
      };
      localStorage.setItem('diversion_vigan_guest_account', JSON.stringify(guestAccount));
      const storedIds: string[] = JSON.parse(localStorage.getItem('diversion_vigan_my_booking_ids') || '[]');
      if (!storedIds.includes(newBooking.id)) {
        storedIds.unshift(newBooking.id);
        localStorage.setItem('diversion_vigan_my_booking_ids', JSON.stringify(storedIds));
      }
    } catch {}

    setBookings((prev) => [newBooking, ...prev]);
    setActiveVoucherBooking(newBooking);
    setSelectedBookingUnit(null);
    showToast(`Reservation ${newBooking.id} created! Confirmation voucher ready.`);

    // 2. Persist to server backend
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBooking),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || 'Server error while saving reservation.', 'error');
      } else if (data.data) {
        setBookings((prev) => prev.map((b) => (b.id === newBooking.id ? data.data : b)));
      }
    } catch (err) {
      console.error('Network error persisting booking:', err);
    }
  }, []);

  // Handle booking status updates from Admin Desk
  const handleUpdateBookingStatus = useCallback(async (bookingId: string, newStatus: BookingStatus, notes?: string) => {
    const isCancelled = newStatus === 'Cancelled';
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === bookingId) {
          return {
            ...b,
            status: newStatus,
            staffNotes: notes ? `${b.staffNotes ? b.staffNotes + ' | ' : ''}${notes}` : b.staffNotes,
            cancellationReason: isCancelled ? (notes || 'Cancelled by Front Desk') : (b.status === 'Cancelled' ? undefined : b.cancellationReason),
            cancelledAt: isCancelled ? new Date().toISOString() : (b.status === 'Cancelled' ? undefined : b.cancelledAt),
          };
        }
        return b;
      })
    );
    showToast(`Booking ${bookingId} ${isCancelled ? 'cancelled & room dates released' : `updated to ${newStatus}`}.`);

    // Sync status with backend
    try {
      await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, notes, cancellationReason: notes }),
      });
    } catch (err) {
      console.error('Failed to sync booking status to server:', err);
    }
  }, []);

  // Handle rebooking from Admin Desk
  const handleRebookBooking = useCallback(async (bookingId: string, updatedFields: Partial<BookingRecord>, note: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/rebook`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updatedFields, note }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setBookings((prev) => prev.map((b) => (b.id === bookingId ? data.data : b)));
        showToast(`Reservation ${bookingId} rebooked successfully on server!`);
        return;
      } else {
        showToast(data.error || 'Conflict: Target dates may already be booked.', 'error');
      }
    } catch (err) {
      console.error('Rebooking error:', err);
    }

    // Fallback local update
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === bookingId) {
          const prevHistory = b.rebookingHistory || [];
          const historyEntry = {
            date: new Date().toISOString(),
            staffName: note || 'Front Desk Staff',
            previousDates: b.stayType === 'nightly' ? `${b.checkInDate} to ${b.checkOutDate}` : `${b.hourlyDate} (${b.hourlyStartTime})`,
            previousRoom: b.roomTitle,
            previousTotal: b.grandTotal,
            notes: note,
          };
          return {
            ...b,
            ...updatedFields,
            rebookedAt: new Date().toISOString(),
            rebookingHistory: [historyEntry, ...prevHistory],
            staffNotes: b.staffNotes ? `${b.staffNotes} | Rebooked on ${new Date().toLocaleDateString()}` : `Rebooked on ${new Date().toLocaleDateString()}`,
          };
        }
        return b;
      })
    );
    showToast(`Reservation ${bookingId} rebooked locally.`);
  }, []);

  // Handle guest inquiry from Contact Tab
  const handleAddInquiry = useCallback(async (inquiry: InquiryRecord) => {
    setInquiries((prev) => [inquiry, ...prev]);
    try {
      await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inquiry),
      });
    } catch (err) {
      console.error('Failed to post inquiry to server:', err);
    }
  }, []);

  // Handle full edit of a booking
  const handleEditBooking = useCallback(async (updatedBooking: BookingRecord) => {
    setBookings((prev) => prev.map((b) => (b.id === updatedBooking.id ? updatedBooking : b)));
    showToast(`Booking ${updatedBooking.id} updated successfully.`);
    try {
      await fetch(`/api/bookings/${updatedBooking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBooking),
      });
    } catch (err) {
      console.error('Failed to sync updated booking to server:', err);
    }
  }, []);

  // Handle permanent deletion of a booking
  const handleDeleteBooking = useCallback(async (bookingId: string) => {
    setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    showToast(`Booking ${bookingId} permanently deleted.`);
    try {
      await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to delete booking on server:', err);
    }
  }, []);

  // Handle edit of an inquiry
  const handleEditInquiry = useCallback(async (updatedInquiry: InquiryRecord) => {
    setInquiries((prev) => prev.map((inq) => (inq.id === updatedInquiry.id ? updatedInquiry : inq)));
    showToast('Inquiry record updated.');
    try {
      await fetch(`/api/inquiries/${updatedInquiry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedInquiry),
      });
    } catch (err) {
      console.error('Failed to update inquiry on server:', err);
    }
  }, []);

  // Handle deletion of an inquiry
  const handleDeleteInquiry = useCallback(async (inquiryId: string) => {
    setInquiries((prev) => prev.filter((inq) => inq.id !== inquiryId));
    showToast('Inquiry record deleted.');
    try {
      await fetch(`/api/inquiries/${inquiryId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to delete inquiry on server:', err);
    }
  }, []);

  // Handle walk-in reservation from Admin Desk
  const handleAddWalkinBooking = useCallback(async (walkin: BookingRecord) => {
    setBookings((prev) => [walkin, ...prev]);
    setActiveVoucherBooking(walkin);
    showToast(`Walk-in reservation ${walkin.id} added!`);
    try {
      await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(walkin),
      });
    } catch (err) {
      console.error('Failed to post walkin reservation:', err);
    }
  }, []);

  // Handle Guest submitting a new room review
  const handleAddReview = useCallback(async (newReview: RoomReview) => {
    setReviews((prev) => [newReview, ...prev]);
    showToast('Thank you! Your room review was submitted and is pending screening by front desk.', 'info');
    try {
      await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReview),
      });
    } catch (err) {
      console.error('Failed to post review to server:', err);
    }
  }, []);

  // Handle Front Desk screening review status (approve, pending, reject)
  const handleUpdateReviewStatus = useCallback(async (reviewId: string, status: ReviewStatus, staffNotes?: string) => {
    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? {
              ...r,
              status,
              staffNotes: staffNotes !== undefined ? staffNotes : r.staffNotes,
              screenedAt: new Date().toISOString(),
              screenedBy: 'Front Desk Admin',
            }
          : r
      )
    );
    showToast(
      status === 'approved'
        ? 'Review ' + reviewId + ' approved and published to room profile!'
        : status === 'pending'
        ? 'Review ' + reviewId + ' set back to pending review.'
        : 'Review ' + reviewId + ' rejected.'
    );
    try {
      await fetch('/api/reviews/' + reviewId + '/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, staffNotes, screenedBy: 'Front Desk Admin' }),
      });
    } catch (err) {
      console.error('Failed to update review status on server:', err);
    }
  }, []);

  // Handle Front Desk deleting review
  const handleDeleteReview = useCallback(async (reviewId: string) => {
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    showToast('Review ' + reviewId + ' deleted.');
    try {
      await fetch('/api/reviews/' + reviewId, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to delete review on server:', err);
    }
  }, []);

  // Handle room inventory & pricing tier edits
  const handleInventoryRoomsUpdate = useCallback(async (updatedRooms: RoomUnit[]) => {
    setRooms((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(updatedRooms)) return prev;
      return updatedRooms;
    });
    try {
      await fetch('/api/rooms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rooms: updatedRooms }),
      });
    } catch (err) {
      console.error('Failed to sync room inventory:', err);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] text-[#2C1E15] antialiased">
      
      {/* Toast Notification with Warm Gold Shimmer */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1F140C] text-[#FFFDF7] px-5 py-3.5 rounded-2xl shadow-2xl border border-[#D4AF37]/60 flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="w-5 h-5 text-[#E5C158] shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Main Navigation Header - with Book Now button */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleNavigateSection}
        isAdminLoggedIn={isAdminLoggedIn}
        onBookNow={() => handleOpenBookingEngine()}
      />

      {/* Real-time Full-Stack Status Bar - Admin Only (Hidden on Guest View) */}
      {isAdminLoggedIn && (
        <div className="bg-[#FAF7F2] border-b border-[#E6D7C3]/60 py-1.5 px-4 sm:px-8 text-[11px] text-[#786150] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isServerConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            <span className="font-semibold text-[#2C1E15]">
              {isServerConnected ? 'Diversion Vigan Central Server Connected' : 'Working in Offline Mode'}
            </span>
            <span className="hidden sm:inline text-[#A08875]">|</span>
            <span className="hidden sm:inline text-[#786150]">
              Real-time Availability Calendar &amp; Front Desk Verification Active
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[#8B6B10] font-bold">
              {bookings.length} Registered Bookings
            </span>
            <button
              type="button"
              onClick={() => syncWithServer(false)}
              disabled={isSyncing}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8B6B10] hover:text-[#2C1E15] transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh bookings and room inventory from server"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Hero Banner (Shown on Explore tab when not in booking flow) */}
      {activeTab === 'explore' && !selectedBookingUnit && (
        <HeroBanner 
          onNavigate={handleNavigateSection} 
          onBookNow={() => handleOpenBookingEngine()} 
        />
      )}

      {/* Main Tab Content Viewport - Freshly mounted on every section change */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {activeTab === 'explore' && (
          selectedBookingUnit ? (
            <BookingEngineTab
              key={`booking-${sectionKey}`}
              rooms={rooms}
              availableAddons={availableAddons}
              existingBookings={bookings}
              preselectedRoomId={selectedBookingUnit.roomId}
              preselectedStayType={selectedBookingUnit.stayType}
              preselectedGuests={selectedBookingUnit.guests}
              preselectedCheckIn={selectedBookingUnit.checkIn}
              preselectedCheckOut={selectedBookingUnit.checkOut}
              onBookingCreated={handleBookingCreated}
              onBack={() => {
                try {
                  if (window.location.hash === '#book-now' || window.location.hash === '#booking-engine') {
                    window.history.replaceState(null, '', window.location.pathname + window.location.search);
                  }
                } catch {}
                setSelectedBookingUnit(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          ) : (
            <ExploreRoomsTab
              key={`explore-${sectionKey}`}
              rooms={rooms}
              onSelectRoomForBooking={handleSelectRoomForBooking}
              onOpenBookingEngine={handleOpenBookingEngine}
            />
          )
        )}

        {activeTab === 'private-villa' && (
          <PrivateVillaTab
            key={`villa-${sectionKey}`}
            rooms={rooms}
            onSelectRoomForBooking={handleSelectRoomForBooking}
            onNavigate={(tab) => handleNavigateSection(tab)}
            onBack={() => handleNavigateSection('explore')}
          />
        )}

        {activeTab === 'my-bookings' && (
          <MyBookingsTab
            key={`mybookings-${sectionKey}`}
            bookings={bookings}
            rooms={rooms}
            onOpenVoucher={(booking) => setActiveVoucherBooking(booking)}
            onOpenSlipLightbox={(booking) => setLightboxSlipBooking(booking)}
            onBookNow={() => handleOpenBookingEngine()}
            onRebookBooking={handleRebookBooking}
            onNavigate={(tab) => handleNavigateSection(tab)}
            onBack={() => handleNavigateSection('explore')}
          />
        )}

        {activeTab === 'contact' && (
          <ContactTab
            key={`contact-${sectionKey}`}
            onAddInquiry={handleAddInquiry}
            onInquirySubmitted={() => {
              showToast('Your inquiry has been sent to our reservations officer!');
            }}
            onNavigate={(tab) => handleNavigateSection(tab)}
            onBack={() => handleNavigateSection('explore')}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDeskTab
            key={`admin-${sectionKey}`}
            bookings={bookings}
            onUpdateBookingStatus={handleUpdateBookingStatus}
            onRebookBooking={handleRebookBooking}
            onEditBooking={handleEditBooking}
            onDeleteBooking={handleDeleteBooking}
            inquiries={inquiries}
            onEditInquiry={handleEditInquiry}
            onDeleteInquiry={handleDeleteInquiry}
            onOpenVoucher={(booking) => setActiveVoucherBooking(booking)}
            onOpenSlipLightbox={(booking) => setLightboxSlipBooking(booking)}
            onAddWalkinBooking={handleAddWalkinBooking}
            isLoggedIn={isAdminLoggedIn}
            setIsLoggedIn={setIsAdminLoggedIn}
            rooms={rooms}
            reviews={reviews}
            onUpdateReviewStatus={handleUpdateReviewStatus}
            onDeleteReview={handleDeleteReview}
            onInventoryRoomsUpdate={handleInventoryRoomsUpdate}
            availableAddons={availableAddons}
            onCustomAddonsUpdate={(updated) => setAvailableAddons(updated)}
            onNavigate={(tab) => handleNavigateSection(tab)}
          />
        )}
      </main>

            {/* Center Pop-Out Notification: Enjoy Your Stay */}
      {showEnjoyStayPopup && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowEnjoyStayPopup(false)}
        >
          <div 
            className="bg-[#FAF7F2] border-2 border-[#D4AF37] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-center space-y-5 animate-in zoom-in-95 duration-200 text-[#2C1E15]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowEnjoyStayPopup(false)}
              className="absolute top-4 right-4 p-2 text-[#786150] hover:text-[#2C1E15] hover:bg-[#E6D7C3]/50 rounded-full transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon Banner */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Sparkles className="w-8 h-8 text-white animate-pulse" />
            </div>

            {/* Titles & Message */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8B6B10] block">
                Diversion Vigan Staycation
              </span>
              <h3 className="font-serif font-bold text-2xl sm:text-3xl text-[#2C1E15]">
                Enjoy Your Stay!
              </h3>
              <p className="text-xs sm:text-sm text-[#786150] leading-relaxed max-w-sm mx-auto">
                We are thrilled to welcome you! Select your stay dates, choose your room, and complete your reservation below.
              </p>
            </div>

            {/* Quick Amenities Pill List */}
            <div className="grid grid-cols-3 gap-2 py-1 text-[11px] font-bold text-[#523A2A]">
              <div className="p-2 rounded-xl bg-white border border-[#E6D7C3]/80 shadow-2xs">
                🏊 Swimming Pool
              </div>
              <div className="p-2 rounded-xl bg-white border border-[#E6D7C3]/80 shadow-2xs">
                🌿 Relaxing Vibe
              </div>
              <div className="p-2 rounded-xl bg-white border border-[#E6D7C3]/80 shadow-2xs">
                🍳 Local Flavors
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowEnjoyStayPopup(false);
                  const el = document.getElementById("booking-step-1");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#2C1E15] hover:bg-[#432F22] text-amber-300 font-serif font-bold text-sm tracking-wide shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Proceed with Reservation</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt / Voucher Modal */}
      <VoucherModal
        booking={activeVoucherBooking}
        onClose={() => setActiveVoucherBooking(null)}
      />

      {/* Slip Receipt Zoom Lightbox */}
      <SlipLightboxModal
        booking={lightboxSlipBooking}
        onClose={() => setLightboxSlipBooking(null)}
        onVerify={(id: string) => handleUpdateBookingStatus(id, 'Confirmed', 'Slip approved via Lightbox verification.')}
        onReject={(id: string, reason: string) => handleUpdateBookingStatus(id, 'Cancelled', reason)}
      />

      {/* Floating Animated Widget to Back to Main Page */}
      <FloatingBackToHomeWidget
        activeTab={activeTab}
        isBookingOpen={Boolean(selectedBookingUnit)}
        onBackToMain={() => {
          setSelectedBookingUnit(null);
          handleNavigateSection('explore');
        }}
      />

      {/* Guest Live Chat */}
      <GuestLiveChatWidget />

      {/* Footer */}
      <Footer 
        onNavigate={handleNavigateSection} 
        onBookNow={() => handleOpenBookingEngine()}
        isAdminLoggedIn={isAdminLoggedIn}
      />

    </div>
  );
}
