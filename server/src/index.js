import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST']
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(express.static(clientDistPath));

// In-memory room store: roomId -> { participants: Map, attendance: Map, presentation: Object, chatHistory: Array }
const rooms = new Map();

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      createdAt: Date.now(),
      endedAt: null,
      participants: new Map(), // socketId -> { id, name, isHost, audioEnabled, videoEnabled, isHandRaised, isScreenSharing }
      attendance: new Map(),   // key -> attendee attendance record
      presentation: null,     // { presenterId, title, currentSlide, totalSlides, slides: [] }
      drawings: {},           // slideIndex -> Array of paths
      chatHistory: [],        // Array of { id, sender, text, timestamp, isSystem }
      finalReport: null
    });
  }
  return rooms.get(roomId);
}

function generateRoomReport(room) {
  const now = room.endedAt || Date.now();
  const totalDurationMs = Math.max(0, now - room.createdAt);

  const attendees = Array.from(room.attendance.values()).map(att => {
    let currentTotalMeetingMs = att.totalMeetingTimeMs || 0;
    if (att.isOnline && att.meetingJoinSince) {
      currentTotalMeetingMs += Math.max(0, now - att.meetingJoinSince);
    }

    let currentCameraOnMs = att.cameraOnTimeMs || 0;
    if (att.isOnline && att.cameraActiveSince) {
      currentCameraOnMs += Math.max(0, now - att.cameraActiveSince);
    }

    let currentMicOnMs = att.micOnTimeMs || 0;
    if (att.isOnline && att.micActiveSince) {
      currentMicOnMs += Math.max(0, now - att.micActiveSince);
    }

    const cameraPercentage = currentTotalMeetingMs > 0
      ? Math.min(100, Math.round((currentCameraOnMs / currentTotalMeetingMs) * 100))
      : 0;

    return {
      id: att.id,
      name: att.name,
      isHost: !!att.isHost,
      isOnline: !!att.isOnline,
      firstJoinedAt: att.firstJoinedAt,
      lastLeftAt: att.isOnline ? null : att.lastLeftAt,
      totalMeetingTimeMs: currentTotalMeetingMs,
      totalMeetingMinutes: Number((currentTotalMeetingMs / 60000).toFixed(1)),
      cameraOnTimeMs: currentCameraOnMs,
      cameraOnMinutes: Number((currentCameraOnMs / 60000).toFixed(1)),
      cameraPercentage,
      micOnMinutes: Number((currentMicOnMs / 60000).toFixed(1)),
    };
  });

  // Calculate average camera engagement
  const totalCamMs = attendees.reduce((sum, a) => sum + a.cameraOnTimeMs, 0);
  const totalAttendMs = attendees.reduce((sum, a) => sum + a.totalMeetingTimeMs, 0);
  const avgCameraPercentage = totalAttendMs > 0 ? Math.min(100, Math.round((totalCamMs / totalAttendMs) * 100)) : 0;

  return {
    roomId: room.id,
    createdAt: room.createdAt,
    endedAt: room.endedAt || now,
    totalDurationMs,
    totalDurationMinutes: Number((totalDurationMs / 60000).toFixed(1)),
    totalParticipantsCount: room.attendance.size,
    avgCameraPercentage,
    attendees
  };
}

// REST API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeRooms: rooms.size, timestamp: new Date() });
});

app.post('/api/rooms/create', (req, res) => {
  const roomId = uuidv4().substring(0, 10);
  getOrCreateRoom(roomId);
  res.json({ roomId, success: true });
});

app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({
    roomId: room.id,
    participantCount: room.participants.size,
    hasPresentation: !!room.presentation,
    createdAt: room.createdAt
  });
});

app.get('/api/rooms/:roomId/report', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  const report = room.finalReport || generateRoomReport(room);
  res.json({ success: true, report });
});

// Socket.IO Real-time Signaling & State Management
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e8, // 100MB buffer for sharing files & slides
  pingTimeout: 60000,
  pingInterval: 25000
});

io.on('connection', (socket) => {
  let currentRoomId = null;
  let currentUserId = null;

  // 1. Join Room
  socket.on('join-room', ({ roomId, user }) => {
    currentRoomId = roomId;
    currentUserId = socket.id;

    socket.join(roomId);

    const room = getOrCreateRoom(roomId);
    const isFirstParticipant = room.participants.size === 0;

    const participant = {
      socketId: socket.id,
      id: user.id || socket.id,
      name: user.name || 'Иштирокчи',
      avatarColor: user.avatarColor || '#3B82F6',
      isHost: isFirstParticipant || !!user.isHost,
      audioEnabled: user.audioEnabled ?? true,
      videoEnabled: user.videoEnabled ?? true,
      isHandRaised: false,
      isScreenSharing: false,
      joinedAt: Date.now()
    };

    room.participants.set(socket.id, participant);

    // Track attendee in room.attendance
    const attendeeKey = (user.name || 'Иштирокчи').trim().toLowerCase();
    socket.attendeeKey = attendeeKey;
    const now = Date.now();

    if (!room.attendance.has(attendeeKey)) {
      room.attendance.set(attendeeKey, {
        id: socket.id,
        name: participant.name,
        isHost: participant.isHost,
        firstJoinedAt: now,
        lastJoinedAt: now,
        lastLeftAt: null,
        isOnline: true,
        totalMeetingTimeMs: 0,
        cameraOnTimeMs: 0,
        micOnTimeMs: 0,
        meetingJoinSince: now,
        cameraActiveSince: participant.videoEnabled ? now : null,
        micActiveSince: participant.audioEnabled ? now : null
      });
    } else {
      const att = room.attendance.get(attendeeKey);
      att.isOnline = true;
      att.id = socket.id;
      att.lastJoinedAt = now;
      att.meetingJoinSince = now;
      if (participant.videoEnabled) {
        att.cameraActiveSince = now;
      }
      if (participant.audioEnabled) {
        att.micActiveSince = now;
      }
      if (participant.isHost) {
        att.isHost = true;
      }
    }

    // List of existing participants to return to the new joiner
    const existingParticipants = Array.from(room.participants.values()).filter(p => p.socketId !== socket.id);

    // Send back room state to new user
    socket.emit('room-joined', {
      self: participant,
      participants: existingParticipants,
      presentation: room.presentation,
      drawings: room.drawings,
      chatHistory: room.chatHistory.slice(-50),
      sessionReport: generateRoomReport(room)
    });

    // Notify others in room
    socket.to(roomId).emit('user-joined', {
      participant
    });

    // Add system chat message
    const joinMessage = {
      id: uuidv4(),
      sender: 'Система',
      text: `${participant.name} конференцияга қўшилди`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true
    };
    room.chatHistory.push(joinMessage);
    io.to(roomId).emit('chat-message', joinMessage);

    console.log(`[Join] User ${participant.name} (${socket.id}) joined room ${roomId}. Total: ${room.participants.size}`);
  });

  // 2. WebRTC Peer Signaling (Offer, Answer, ICE Candidate)
  socket.on('signal-offer', ({ targetSocketId, offer }) => {
    io.to(targetSocketId).emit('signal-offer', {
      senderSocketId: socket.id,
      offer
    });
  });

  socket.on('signal-answer', ({ targetSocketId, answer }) => {
    io.to(targetSocketId).emit('signal-answer', {
      senderSocketId: socket.id,
      answer
    });
  });

  socket.on('ice-candidate', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('ice-candidate', {
      senderSocketId: socket.id,
      candidate
    });
  });

  // 3. Media Controls (Audio, Video, Screen Share)
  socket.on('toggle-media', ({ mediaType, enabled }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (participant) {
      if (mediaType === 'audio') participant.audioEnabled = enabled;
      if (mediaType === 'video') participant.videoEnabled = enabled;
      if (mediaType === 'screen') participant.isScreenSharing = enabled;

      // Track camera and mic duration
      const attendeeKey = socket.attendeeKey;
      if (attendeeKey && room.attendance.has(attendeeKey)) {
        const att = room.attendance.get(attendeeKey);
        const now = Date.now();
        if (mediaType === 'video') {
          if (enabled) {
            if (!att.cameraActiveSince) att.cameraActiveSince = now;
          } else {
            if (att.cameraActiveSince) {
              att.cameraOnTimeMs = (att.cameraOnTimeMs || 0) + (now - att.cameraActiveSince);
              att.cameraActiveSince = null;
            }
          }
        }
        if (mediaType === 'audio') {
          if (enabled) {
            if (!att.micActiveSince) att.micActiveSince = now;
          } else {
            if (att.micActiveSince) {
              att.micOnTimeMs = (att.micOnTimeMs || 0) + (now - att.micActiveSince);
              att.micActiveSince = null;
            }
          }
        }
      }

      io.to(currentRoomId).emit('user-media-toggled', {
        socketId: socket.id,
        mediaType,
        enabled
      });
    }
  });

  // 4. Raise Hand
  socket.on('toggle-raise-hand', ({ raised }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (participant) {
      participant.isHandRaised = raised;
      io.to(currentRoomId).emit('user-hand-toggled', {
        socketId: socket.id,
        isHandRaised: raised,
        userName: participant.name
      });
    }
  });

  // 5. Emoji Reactions
  socket.on('send-reaction', ({ emoji }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    const participant = room?.participants.get(socket.id);
    const senderName = participant?.name || 'Иштирокчи';

    io.to(currentRoomId).emit('reaction-received', {
      id: uuidv4(),
      socketId: socket.id,
      userName: senderName,
      emoji
    });
  });

  // 6. Text Chat
  socket.on('send-chat', ({ text }) => {
    if (!currentRoomId || !text?.trim()) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    const message = {
      id: uuidv4(),
      senderSocketId: socket.id,
      sender: participant?.name || 'Иштирокчи',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: false
    };

    room.chatHistory.push(message);
    if (room.chatHistory.length > 200) room.chatHistory.shift();

    io.to(currentRoomId).emit('chat-message', message);
  });

  // 7. Interactive Presentation & Slides
  socket.on('start-presentation', ({ presentation }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    room.presentation = {
      ...presentation,
      presenterSocketId: socket.id,
      presenterName: participant?.name || 'Бошловчи',
      currentSlide: presentation.currentSlide || 0
    };
    room.drawings = {};

    io.to(currentRoomId).emit('presentation-started', room.presentation);
  });

  socket.on('presentation-update-deck', ({ presentation }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    room.presentation = {
      ...room.presentation,
      ...presentation,
      presenterSocketId: socket.id,
      presenterName: participant?.name || 'Бошловчи',
      currentSlide: 0
    };
    room.drawings = {};

    io.to(currentRoomId).emit('presentation-deck-updated', room.presentation);
  });

  socket.on('stop-presentation', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    room.presentation = null;
    room.drawings = {};
    io.to(currentRoomId).emit('presentation-stopped');
  });

  socket.on('presentation-change-slide', ({ slideIndex }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || !room.presentation) return;

    // Only presenter can change slides
    if (room.presentation.presenterSocketId === socket.id) {
      room.presentation.currentSlide = slideIndex;
      io.to(currentRoomId).emit('presentation-slide-updated', { slideIndex });
    }
  });

  socket.on('presentation-laser-move', ({ x, y, active }) => {
    if (!currentRoomId) return;
    // Broadcast laser pointer coordinates to all other participants
    socket.to(currentRoomId).emit('presentation-laser-updated', {
      presenterSocketId: socket.id,
      x,
      y,
      active
    });
  });

  socket.on('presentation-draw-stroke', ({ slideIndex, stroke }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    if (!room.drawings[slideIndex]) {
      room.drawings[slideIndex] = [];
    }
    room.drawings[slideIndex].push(stroke);

    socket.to(currentRoomId).emit('presentation-stroke-received', {
      slideIndex,
      stroke
    });
  });

  socket.on('presentation-clear-drawings', ({ slideIndex }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    if (slideIndex !== undefined) {
      room.drawings[slideIndex] = [];
    } else {
      room.drawings = {};
    }

    io.to(currentRoomId).emit('presentation-drawings-cleared', { slideIndex });
  });

  // 8. Host Moderation Controls
  socket.on('host-mute-participant', ({ targetSocketId }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    const host = room?.participants.get(socket.id);
    if (host?.isHost) {
      io.to(targetSocketId).emit('force-mute-audio');
    }
  });

  socket.on('host-mute-all', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    const host = room?.participants.get(socket.id);
    if (host?.isHost) {
      socket.to(currentRoomId).emit('force-mute-audio');
    }
  });

  socket.on('host-kick-participant', ({ targetSocketId }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    const host = room?.participants.get(socket.id);
    if (host?.isHost) {
      io.to(targetSocketId).emit('kicked-from-room');
    }
  });

  // 9. Meeting Report & End Meeting For All
  socket.on('get-meeting-report', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    const report = room.finalReport || generateRoomReport(room);
    socket.emit('meeting-report-data', report);
  });

  socket.on('end-meeting-for-all', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (!participant?.isHost) return;

    const now = Date.now();
    room.endedAt = now;

    // Finalize all active attendees
    for (const att of room.attendance.values()) {
      if (att.isOnline) {
        if (att.meetingJoinSince) {
          att.totalMeetingTimeMs = (att.totalMeetingTimeMs || 0) + (now - att.meetingJoinSince);
          att.meetingJoinSince = null;
        }
        if (att.cameraActiveSince) {
          att.cameraOnTimeMs = (att.cameraOnTimeMs || 0) + (now - att.cameraActiveSince);
          att.cameraActiveSince = null;
        }
        if (att.micActiveSince) {
          att.micOnTimeMs = (att.micOnTimeMs || 0) + (now - att.micActiveSince);
          att.micActiveSince = null;
        }
        att.isOnline = false;
        att.lastLeftAt = now;
      }
    }

    const report = generateRoomReport(room);
    room.finalReport = report;

    // Broadcast report to everyone in the room
    io.to(currentRoomId).emit('meeting-ended-with-report', {
      report,
      endedByHost: true,
      hostName: participant.name
    });

    console.log(`[Meeting Ended] Room ${currentRoomId} ended by host ${participant.name}. Duration: ${report.totalDurationMinutes} mins, Attendees: ${report.attendees.length}`);
  });

  // 10. Disconnect
  socket.on('disconnect', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    // Update attendee attendance stats upon disconnect
    const attendeeKey = socket.attendeeKey;
    if (attendeeKey && room.attendance.has(attendeeKey)) {
      const att = room.attendance.get(attendeeKey);
      const now = Date.now();
      att.isOnline = false;
      att.lastLeftAt = now;
      if (att.meetingJoinSince) {
        att.totalMeetingTimeMs = (att.totalMeetingTimeMs || 0) + (now - att.meetingJoinSince);
        att.meetingJoinSince = null;
      }
      if (att.cameraActiveSince) {
        att.cameraOnTimeMs = (att.cameraOnTimeMs || 0) + (now - att.cameraActiveSince);
        att.cameraActiveSince = null;
      }
      if (att.micActiveSince) {
        att.micOnTimeMs = (att.micOnTimeMs || 0) + (now - att.micActiveSince);
        att.micActiveSince = null;
      }
    }

    const participant = room.participants.get(socket.id);
    if (participant) {
      room.participants.delete(socket.id);

      // If presenter left, stop presentation
      if (room.presentation?.presenterSocketId === socket.id) {
        room.presentation = null;
        room.drawings = {};
        io.to(currentRoomId).emit('presentation-stopped');
      }

      // If host left and there are other participants, assign host to next participant
      if (participant.isHost && room.participants.size > 0) {
        const nextHost = room.participants.values().next().value;
        nextHost.isHost = true;
        io.to(currentRoomId).emit('host-changed', { newHostSocketId: nextHost.socketId });
      }

      io.to(currentRoomId).emit('user-left', {
        socketId: socket.id,
        name: participant.name
      });

      const leaveMessage = {
        id: uuidv4(),
        sender: 'Система',
        text: `${participant.name} тарк этди`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSystem: true
      };
      room.chatHistory.push(leaveMessage);
      io.to(currentRoomId).emit('chat-message', leaveMessage);

      console.log(`[Leave] User ${participant.name} (${socket.id}) left room ${currentRoomId}. Remaining: ${room.participants.size}`);

      // Clean up empty rooms after 1 hour
      if (room.participants.size === 0) {
        setTimeout(() => {
          if (rooms.get(currentRoomId)?.participants.size === 0) {
            rooms.delete(currentRoomId);
            console.log(`[Cleanup] Room ${currentRoomId} deleted`);
          }
        }, 3600000);
      }
    }
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 Video Conference Server running on port ${PORT}`);
  console.log(`📡 Ready for WebRTC signaling and Presentations`);
  console.log(`===============================================`);
});
