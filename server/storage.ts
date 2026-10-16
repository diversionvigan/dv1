import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BookingRecord, BookingStatus, InquiryRecord, RoomUnit, RoomReview, ReviewStatus } from '../src/types';
import { ROOMS_DATA } from '../src/data/roomsData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');
const INQUIRIES_FILE = path.join(DATA_DIR, 'inquiries.json');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');

const SEED_REVIEWS: RoomReview[] = [];
const SEED_BOOKINGS: BookingRecord[] = [];
const SEED_INQUIRIES: InquiryRecord[] = [];

// Helper read/write functions
function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data) as T;
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return fallback;
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    const tempPath = filePath + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// Initialize seed data if files do not exist
if (!fs.existsSync(BOOKINGS_FILE)) {
  writeJsonFile(BOOKINGS_FILE, SEED_BOOKINGS);
}
if (!fs.existsSync(INQUIRIES_FILE)) {
  writeJsonFile(INQUIRIES_FILE, SEED_INQUIRIES);
}
if (!fs.existsSync(REVIEWS_FILE)) {
  writeJsonFile(REVIEWS_FILE, SEED_REVIEWS);
}
if (!fs.existsSync(ROOMS_FILE)) {
  writeJsonFile(ROOMS_FILE, ROOMS_DATA);
}

export const Storage = {
  // Bookings
  getBookings(): BookingRecord[] {
    return readJsonFile<BookingRecord[]>(BOOKINGS_FILE, []);
  },

  saveBookings(bookings: BookingRecord[]): void {
    writeJsonFile(BOOKINGS_FILE, bookings);
  },

  addBooking(booking: BookingRecord): BookingRecord {
    const list = this.getBookings();
    // Prepend new booking
    const updated = [booking, ...list];
    this.saveBookings(updated);
    return booking;
  },

  updateBookingStatus(
    bookingId: string, 
    status: BookingStatus, 
    notes?: string, 
    cancellationReason?: string
  ): BookingRecord | null {
    const list = this.getBookings();
    let updatedRecord: BookingRecord | null = null;

    const updated = list.map((b) => {
      if (b.id === bookingId) {
        const isCancelled = status === 'Cancelled';
        updatedRecord = {
          ...b,
          status,
          staffNotes: notes ? (b.staffNotes ? `${b.staffNotes} | ${notes}` : notes) : b.staffNotes,
          cancellationReason: isCancelled ? (cancellationReason || notes || 'Cancelled by Front Desk') : (b.status === 'Cancelled' ? undefined : b.cancellationReason),
          cancelledAt: isCancelled ? new Date().toISOString() : (b.status === 'Cancelled' ? undefined : b.cancelledAt),
        };
        return updatedRecord;
      }
      return b;
    });

    if (updatedRecord) {
      this.saveBookings(updated);
    }
    return updatedRecord;
  },

  rebook(bookingId: string, fields: Partial<BookingRecord>, note: string): BookingRecord | null {
    const list = this.getBookings();
    let updatedRecord: BookingRecord | null = null;

    const updated = list.map((b) => {
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
        updatedRecord = {
          ...b,
          ...fields,
          rebookedAt: new Date().toISOString(),
          rebookingHistory: [historyEntry, ...prevHistory],
          staffNotes: b.staffNotes ? `${b.staffNotes} | Rebooked on ${new Date().toLocaleDateString()}: ${note}` : `Rebooked: ${note}`,
        };
        return updatedRecord;
      }
      return b;
    });

    if (updatedRecord) {
      this.saveBookings(updated);
    }
    return updatedRecord;
  },

  deleteBooking(bookingId: string): boolean {
    const list = this.getBookings();
    const filtered = list.filter((b) => b.id !== bookingId);
    if (filtered.length !== list.length) {
      this.saveBookings(filtered);
      return true;
    }
    return false;
  },

  // Date conflict checker to prevent double-booking
  hasDateConflict(
    roomId: string,
    stayType: 'nightly' | 'hourly',
    checkInDate?: string,
    checkOutDate?: string,
    hourlyDate?: string,
    excludeBookingId?: string
  ): { hasConflict: boolean; conflictingBooking?: BookingRecord } {
    const list = this.getBookings();

    for (const b of list) {
      if (b.id === excludeBookingId) continue;
      if (b.roomId !== roomId) continue;
      if (b.status === 'Cancelled') continue; // Cancelled releases the room

      if (stayType === 'nightly' && checkInDate && checkOutDate) {
        if (b.stayType === 'nightly' && b.checkInDate && b.checkOutDate) {
          // Check date overlap: [checkInDate, checkOutDate) with [b.checkInDate, b.checkOutDate)
          if (checkInDate < b.checkOutDate && checkOutDate > b.checkInDate) {
            return { hasConflict: true, conflictingBooking: b };
          }
        } else if (b.stayType === 'hourly' && b.hourlyDate) {
          if (b.hourlyDate >= checkInDate && b.hourlyDate < checkOutDate) {
            return { hasConflict: true, conflictingBooking: b };
          }
        }
      } else if (stayType === 'hourly' && hourlyDate) {
        if (b.stayType === 'hourly' && b.hourlyDate === hourlyDate) {
          return { hasConflict: true, conflictingBooking: b };
        } else if (b.stayType === 'nightly' && b.checkInDate && b.checkOutDate) {
          if (hourlyDate >= b.checkInDate && hourlyDate < b.checkOutDate) {
            return { hasConflict: true, conflictingBooking: b };
          }
        }
      }
    }

    return { hasConflict: false };
  },

  // Inquiries
  getInquiries(): InquiryRecord[] {
    return readJsonFile<InquiryRecord[]>(INQUIRIES_FILE, []);
  },

  saveInquiries(inquiries: InquiryRecord[]): void {
    writeJsonFile(INQUIRIES_FILE, inquiries);
  },

  addInquiry(inquiry: InquiryRecord): InquiryRecord {
    const list = this.getInquiries();
    const updated = [inquiry, ...list];
    this.saveInquiries(updated);
    return inquiry;
  },

  updateInquiryStatus(id: string, status: 'New' | 'Replied' | 'Archived'): InquiryRecord | null {
    const list = this.getInquiries();
    let found: InquiryRecord | null = null;
    const updated = list.map((inq) => {
      if (inq.id === id) {
        found = { ...inq, status };
        return found;
      }
      return inq;
    });
    if (found) {
      this.saveInquiries(updated);
    }
    return found;
  },

  updateInquiry(id: string, updatedInquiry: InquiryRecord): InquiryRecord | null {
    const list = this.getInquiries();
    let found: InquiryRecord | null = null;
    const updated = list.map((inq) => {
      if (inq.id === id) {
        found = { ...inq, ...updatedInquiry, id };
        return found;
      }
      return inq;
    });
    if (found) {
      this.saveInquiries(updated);
    }
    return found;
  },

  deleteInquiry(id: string): boolean {
    const list = this.getInquiries();
    const filtered = list.filter((inq) => inq.id !== id);
    if (filtered.length !== list.length) {
      this.saveInquiries(filtered);
      return true;
    }
    return false;
  },

  updateBooking(id: string, updatedBooking: BookingRecord): BookingRecord | null {
    const list = this.getBookings();
    let found: BookingRecord | null = null;
    const updated = list.map((b) => {
      if (b.id === id) {
        found = { ...b, ...updatedBooking, id };
        return found;
      }
      return b;
    });
    if (found) {
      this.saveBookings(updated);
    }
    return found;
  },

  // Rooms Inventory
  getRooms(): RoomUnit[] {
    return readJsonFile<RoomUnit[]>(ROOMS_FILE, ROOMS_DATA);
  },

  // Room Reviews
  getReviews(): RoomReview[] {
    return readJsonFile<RoomReview[]>(REVIEWS_FILE, []);
  },

  saveReviews(reviews: RoomReview[]): void {
    writeJsonFile(REVIEWS_FILE, reviews);
  },

  addReview(review: RoomReview): RoomReview {
    const list = this.getReviews();
    const updated = [review, ...list];
    this.saveReviews(updated);
    return review;
  },

  updateReviewStatus(id: string, status: ReviewStatus, staffNotes?: string, screenedBy?: string): RoomReview | null {
    const list = this.getReviews();
    let found: RoomReview | null = null;
    const updated = list.map((r) => {
      if (r.id === id) {
        found = {
          ...r,
          status,
          staffNotes: staffNotes !== undefined ? staffNotes : r.staffNotes,
          screenedAt: new Date().toISOString(),
          screenedBy: screenedBy || 'Front Desk Staff',
        };
        return found;
      }
      return r;
    });
    if (found) {
      this.saveReviews(updated);
    }
    return found;
  },

  deleteReview(id: string): boolean {
    const list = this.getReviews();
    const filtered = list.filter((r) => r.id !== id);
    if (filtered.length !== list.length) {
      this.saveReviews(filtered);
      return true;
    }
    return false;
  },

  saveRooms(rooms: RoomUnit[]): void {
    writeJsonFile(ROOMS_FILE, rooms);
  }
};
