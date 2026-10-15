import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Storage } from './server/storage';
import { GitService } from './server/gitService';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Permanent uploads directory
  const UPLOADS_DIR = path.resolve(__dirname, 'public', 'uploads');
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Statically serve uploaded images permanently
  app.use('/uploads', express.static(UPLOADS_DIR));

  // ==========================================
  // PERMANENT IMAGE UPLOAD REST API
  // ==========================================
  app.post('/api/upload', (req, res) => {
    try {
      const { image, images, folder } = req.body;

      const items: string[] = [];
      if (Array.isArray(images) && images.length > 0) {
        images.forEach((img: any) => {
          if (typeof img === 'string') items.push(img);
          else if (img && typeof img.data === 'string') items.push(img.data);
        });
      } else if (typeof image === 'string') {
        items.push(image);
      }

      if (items.length === 0) {
        return res.status(400).json({ success: false, error: 'No image data provided.' });
      }

      const savedUrls: string[] = [];

      for (let i = 0; i < items.length; i++) {
        const base64Str = items[i];
        if (!base64Str) continue;

        // If it's already an existing URL path, retain it
        if (base64Str.startsWith('/uploads/') || base64Str.startsWith('http://') || base64Str.startsWith('https://')) {
          savedUrls.push(base64Str);
          continue;
        }

        // Determine extension and buffer
        const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        let ext = 'jpg';
        let buffer: Buffer;

        if (matches && matches.length === 3) {
          const mimeType = matches[1].toLowerCase();
          if (mimeType.includes('png')) ext = 'png';
          else if (mimeType.includes('webp')) ext = 'webp';
          else if (mimeType.includes('gif')) ext = 'gif';
          else if (mimeType.includes('svg')) ext = 'svg';
          buffer = Buffer.from(matches[2], 'base64');
        } else {
          const raw = base64Str.replace(/^data:[^;]+;base64,/, '');
          buffer = Buffer.from(raw, 'base64');
        }

        const timestamp = Date.now();
        const rand = Math.floor(1000 + Math.random() * 9000);
        const prefix = folder ? `${folder}_` : 'img_';
        const fileName = `${prefix}${timestamp}_${i + 1}_${rand}.${ext}`;
        const filePath = path.join(UPLOADS_DIR, fileName);

        fs.writeFileSync(filePath, buffer);
        savedUrls.push(`/uploads/${fileName}`);
      }

      res.json({
        success: true,
        url: savedUrls[0] || '',
        urls: savedUrls,
      });
    } catch (err: any) {
      console.error('Error handling permanent image upload:', err);
      res.status(500).json({ success: false, error: 'Failed to upload and store image permanently.' });
    }
  });

  // ==========================================
  // BOOKINGS REST API ENDPOINTS
  // ==========================================

  // 1. GET all bookings
  app.get('/api/bookings', (_req, res) => {
    try {
      const bookings = Storage.getBookings();
      res.json({ success: true, count: bookings.length, data: bookings });
    } catch (err: any) {
      console.error('Error fetching bookings:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch bookings.' });
    }
  });

  // 2. POST create new booking (with date conflict check)
  app.post('/api/bookings', (req, res) => {
    try {
      const bookingData = req.body;

      if (!bookingData.guestName || !bookingData.guestPhone || !bookingData.roomId) {
        return res.status(400).json({
          success: false,
          error: 'Missing mandatory fields: Guest name, phone, and accommodation unit are required.'
        });
      }

      // Check for date collision to prevent double-booking
      const conflict = Storage.hasDateConflict(
        bookingData.roomId,
        bookingData.stayType,
        bookingData.checkInDate,
        bookingData.checkOutDate,
        bookingData.hourlyDate
      );

      if (conflict.hasConflict) {
        return res.status(409).json({
          success: false,
          error: `Selected dates are already booked for ${bookingData.roomTitle || 'this room'}. Please select available dates.`,
          conflictingBookingId: conflict.conflictingBooking?.id
        });
      }

      // Ensure unique ID if not provided
      if (!bookingData.id) {
        bookingData.id = `DV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      }
      if (!bookingData.createdAt) {
        bookingData.createdAt = new Date().toISOString();
      }

      const created = Storage.addBooking(bookingData);
      res.status(201).json({ success: true, data: created });
    } catch (err: any) {
      console.error('Error creating booking:', err);
      res.status(500).json({ success: false, error: 'Failed to create booking.' });
    }
  });

  // 3. PATCH update booking status (Approve slip, check-in, check-out, cancel)
  app.patch('/api/bookings/:id/status', (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes, cancellationReason } = req.body;

      if (!status) {
        return res.status(400).json({ success: false, error: 'Status is required.' });
      }

      const updated = Storage.updateBookingStatus(id, status, notes, cancellationReason);
      if (!updated) {
        return res.status(404).json({ success: false, error: `Booking ${id} not found.` });
      }

      res.json({ success: true, data: updated });
    } catch (err: any) {
      console.error(`Error updating booking status for ${req.params.id}:`, err);
      res.status(500).json({ success: false, error: 'Failed to update booking status.' });
    }
  });

  // 4. PUT rebook dates / room
  app.put('/api/bookings/:id/rebook', (req, res) => {
    try {
      const { id } = req.params;
      const { updatedFields, note } = req.body;

      if (!updatedFields) {
        return res.status(400).json({ success: false, error: 'Updated fields are required.' });
      }

      // Check conflict with new target dates (excluding self)
      const targetRoomId = updatedFields.roomId;
      const targetStayType = updatedFields.stayType;
      const targetCheckIn = updatedFields.checkInDate;
      const targetCheckOut = updatedFields.checkOutDate;
      const targetHourlyDate = updatedFields.hourlyDate;

      if (targetRoomId) {
        const conflict = Storage.hasDateConflict(
          targetRoomId,
          targetStayType,
          targetCheckIn,
          targetCheckOut,
          targetHourlyDate,
          id
        );
        if (conflict.hasConflict) {
          return res.status(409).json({
            success: false,
            error: 'Target rebooking dates conflict with an existing reservation.',
            conflictingBookingId: conflict.conflictingBooking?.id
          });
        }
      }

      const rebooked = Storage.rebook(id, updatedFields, note || 'Front Desk rebooking');
      if (!rebooked) {
        return res.status(404).json({ success: false, error: `Booking ${id} not found.` });
      }

      res.json({ success: true, data: rebooked });
    } catch (err: any) {
      console.error(`Error rebooking ${req.params.id}:`, err);
      res.status(500).json({ success: false, error: 'Failed to rebook reservation.' });
    }
  });

  // 5. PUT edit full booking
  app.put('/api/bookings/:id', (req, res) => {
    try {
      const { id } = req.params;
      const updatedData = req.body;
      const updated = Storage.updateBooking(id, updatedData);
      if (!updated) {
        return res.status(404).json({ success: false, error: `Booking ${id} not found.` });
      }
      res.json({ success: true, data: updated });
    } catch (err: any) {
      console.error(`Error updating booking ${req.params.id}:`, err);
      res.status(500).json({ success: false, error: 'Failed to update booking.' });
    }
  });

  // 6. DELETE cancel/delete booking
  app.delete('/api/bookings/:id', (req, res) => {
    try {
      const { id } = req.params;
      const deleted = Storage.deleteBooking(id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: `Booking ${id} not found.` });
      }
      res.json({ success: true, message: `Booking ${id} deleted.` });
    } catch (err: any) {
      console.error(`Error deleting booking ${req.params.id}:`, err);
      res.status(500).json({ success: false, error: 'Failed to delete booking.' });
    }
  });

  // 7. Clear all bookings (Production purge)
  app.post('/api/bookings/clear', (_req, res) => {
    try {
      Storage.saveBookings([]);
      res.json({ success: true, message: 'All bookings cleared successfully.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Failed to clear bookings.' });
    }
  });

  // ==========================================
  // INQUIRIES REST API ENDPOINTS
  // ==========================================

  app.get('/api/inquiries', (_req, res) => {
    try {
      const inquiries = Storage.getInquiries();
      res.json({ success: true, count: inquiries.length, data: inquiries });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Failed to fetch inquiries.' });
    }
  });

  app.post('/api/inquiries', (req, res) => {
    try {
      const inq = req.body;
      if (!inq.fullName || !inq.phone) {
        return res.status(400).json({ success: false, error: 'Full name and phone are required.' });
      }
      if (!inq.id) {
        inq.id = `INQ-${Math.floor(1000 + Math.random() * 9000)}`;
      }
      if (!inq.createdAt) {
        inq.createdAt = new Date().toISOString();
      }
      if (!inq.status) {
        inq.status = 'New';
      }
      const created = Storage.addInquiry(inq);
      res.status(201).json({ success: true, data: created });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Failed to save inquiry.' });
    }
  });

  app.put('/api/inquiries/:id', (req, res) => {
    try {
      const { id } = req.params;
      const updatedInq = req.body;
      const updated = Storage.updateInquiry(id, updatedInq);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Inquiry not found.' });
      }
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Failed to update inquiry.' });
    }
  });

  app.patch('/api/inquiries/:id/status', (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updated = Storage.updateInquiryStatus(id, status);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Inquiry not found.' });
      }
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Failed to update inquiry.' });
    }
  });

  app.delete('/api/inquiries/:id', (req, res) => {
    try {
      const { id } = req.params;
      const deleted = Storage.deleteInquiry(id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Inquiry not found.' });
      }
      res.json({ success: true, message: `Inquiry ${id} deleted.` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Failed to delete inquiry.' });
    }
  });

  // ==========================================
  // ROOM REVIEWS REST API
  // ==========================================

  // 1. GET all reviews (optional filter by roomId or status)
  app.get('/api/reviews', (req, res) => {
    try {
      const { roomId, status } = req.query;
      let reviews = Storage.getReviews();
      if (roomId && typeof roomId === 'string') {
        reviews = reviews.filter((r) => r.roomId === roomId);
      }
      if (status && typeof status === 'string') {
        reviews = reviews.filter((r) => r.status === status);
      }
      res.json({ success: true, count: reviews.length, data: reviews });
    } catch (err: any) {
      console.error('Error fetching reviews:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch reviews.' });
    }
  });

  // 2. POST create review (guest leaves review, defaults to pending)
  app.post('/api/reviews', (req, res) => {
    try {
      const { roomId, roomTitle, guestName, guestEmail, rating, comment, stayDate } = req.body;
      if (!roomId || !guestName || !comment) {
        return res.status(400).json({ success: false, error: 'Room, guest name, and review comment are required.' });
      }
      const newReview = {
        id: "REV-" + Date.now().toString().slice(-4) + Math.floor(100 + Math.random() * 900),
        roomId,
        roomTitle: roomTitle || 'Diversion Vigan Room',
        guestName,
        guestEmail: guestEmail || '',
        rating: Number(rating) || 5,
        comment,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        stayDate: stayDate || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      };
      const created = Storage.addReview(newReview);
      res.status(201).json({ success: true, data: created });
    } catch (err: any) {
      console.error('Error adding review:', err);
      res.status(500).json({ success: false, error: 'Failed to submit review.' });
    }
  });

  // 3. PATCH update review status (approve, pending, reject)
  app.patch('/api/reviews/:id/status', (req, res) => {
    try {
      const { id } = req.params;
      const { status, staffNotes, screenedBy } = req.body;
      if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Valid status (pending, approved, rejected) is required.' });
      }
      const updated = Storage.updateReviewStatus(id, status, staffNotes, screenedBy);
      if (!updated) {
        return res.status(404).json({ success: false, error: "Review not found." });
      }
      res.json({ success: true, data: updated });
    } catch (err: any) {
      console.error("Error updating review:", err);
      res.status(500).json({ success: false, error: 'Failed to update review status.' });
    }
  });

  // 4. DELETE review
  app.delete('/api/reviews/:id', (req, res) => {
    try {
      const { id } = req.params;
      const deleted = Storage.deleteReview(id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Review not found.' });
      }
      res.json({ success: true, message: "Review deleted." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Failed to delete review.' });
    }
  });

  // ==========================================
  // ROOMS INVENTORY REST API
  // ==========================================

  app.get('/api/rooms', (_req, res) => {
    try {
      const rooms = Storage.getRooms();
      res.json({ success: true, data: rooms });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Failed to fetch rooms.' });
    }
  });

  app.put('/api/rooms', (req, res) => {
    try {
      const { rooms } = req.body;
      if (!Array.isArray(rooms)) {
        return res.status(400).json({ success: false, error: 'Rooms must be an array.' });
      }
      Storage.saveRooms(rooms);
      res.json({ success: true, data: rooms });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Failed to save rooms.' });
    }
  });

  // Safe merge restore endpoint (Adds on records, never overwrites existing records)
  app.post('/api/restore', (req, res) => {
    try {
      const { bookings, inquiries, rooms } = req.body;
      let addedBookings = 0;
      let addedInquiries = 0;
      let addedRooms = 0;

      if (Array.isArray(bookings) && bookings.length > 0) {
        const current = Storage.getBookings();
        const existingIds = new Set(current.map((b) => String(b.id || (b as any).bookingReference || (b as any).referenceNumber)));
        const toAdd = bookings.filter((b) => {
          const id = b.id || (b as any).bookingReference || (b as any).referenceNumber;
          return id ? !existingIds.has(String(id)) : false;
        });
        if (toAdd.length > 0) {
          Storage.saveBookings([...current, ...toAdd]);
          addedBookings = toAdd.length;
        }
      }

      if (Array.isArray(inquiries) && inquiries.length > 0) {
        const current = Storage.getInquiries();
        const existingIds = new Set(current.map((i) => String(i.id || i.createdAt)));
        const toAdd = inquiries.filter((i) => {
          const id = i.id || i.createdAt;
          return id ? !existingIds.has(String(id)) : false;
        });
        if (toAdd.length > 0) {
          Storage.saveInquiries([...current, ...toAdd]);
          addedInquiries = toAdd.length;
        }
      }

      if (Array.isArray(rooms) && rooms.length > 0) {
        const current = Storage.getRooms();
        const existingIds = new Set(current.map((r) => String(r.id)));
        const toAdd = rooms.filter((r) => r.id && !existingIds.has(String(r.id)));
        if (toAdd.length > 0) {
          Storage.saveRooms([...current, ...toAdd]);
          addedRooms = toAdd.length;
        }
      }

      res.json({
        success: true,
        message: 'Backup data added successfully. Existing records preserved.',
        added: { bookings: addedBookings, inquiries: addedInquiries, rooms: addedRooms },
      });
    } catch (err: any) {
      console.error('Error during /api/restore:', err);
      res.status(500).json({ success: false, error: 'Failed to merge restore data.' });
    }
  });

  // ==========================================
  // GITHUB & VPS AUTO-DEPLOYMENT REST API
  // ==========================================

  // 1. Get current git status, latest commit, and remote details
  app.get('/api/github/status', (_req, res) => {
    try {
      const status = GitService.getStatus();
      res.json({ success: true, ...status });
    } catch (err: any) {
      console.error('Error fetching git status:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to get Git status.' });
    }
  });

  // 2. Test GitHub repository authentication and access
  app.post('/api/github/test-connection', async (req, res) => {
    try {
      const { repoUrl, githubToken } = req.body;
      if (!repoUrl || !githubToken) {
        return res.status(400).json({ success: false, message: 'Repository URL and GitHub token are required.' });
      }
      const result = await GitService.testConnection(repoUrl, githubToken);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Connection test failed.' });
    }
  });

  // 3. Commit all latest files/data and push to GitHub (triggers GitHub Actions VPS auto-deploy)
  app.post('/api/github/push', async (req, res) => {
    try {
      const { repoUrl, githubToken, branch, commitMessage, authorName, authorEmail, forcePush } = req.body;
      if (!repoUrl || !githubToken) {
        return res.status(400).json({ success: false, error: 'Repository URL and GitHub Token are required.' });
      }

      const result = await GitService.pushToGitHub({
        repoUrl,
        githubToken,
        branch: branch || 'main',
        commitMessage: commitMessage || 'Auto-update Diversion Vigan App & Bookings Data',
        authorName: authorName || 'Diversion Vigan Admin',
        authorEmail: authorEmail || 'admin@diversionvigan.ph',
        forcePush: Boolean(forcePush),
      });

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json(result);
    } catch (err: any) {
      console.error('Error pushing to GitHub:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to push to GitHub.' });
    }
  });

  // Health and Sync status check
  app.get('/api/health', (_req, res) => {
    const bookings = Storage.getBookings();
    res.json({
      status: 'healthy',
      serverTime: new Date().toISOString(),
      bookingsCount: bookings.length,
    });
  });

  // One-click deployment bundle download for VPS
  app.get('/api/download/bundle', (_req, res) => {
    const bundlePath = path.resolve(__dirname, 'public', 'dv2-app-bundle.tar.gz');
    res.download(bundlePath, 'dv2-app-bundle.tar.gz');
  });

  // Vite integration
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Diversion Vigan Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
