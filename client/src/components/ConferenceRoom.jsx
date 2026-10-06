import React, { useState, useEffect, useRef, useCallback } from 'react';
import { socket } from '../services/socket';
import { useWebRTC } from '../hooks/useWebRTC';
import { VideoGrid } from './VideoGrid';
import { PresentationView } from './PresentationView';
import { ScreenShareView } from './ScreenShareView';
import { ControlsBar } from './ControlsBar';
import { AsfarmaLogo } from './AsfarmaLogo';
import { ChatPanel } from './ChatPanel';
import { ParticipantsPanel } from './ParticipantsPanel';
import { ReactionsOverlay } from './ReactionsOverlay';
import { MeetingInfoModal } from './MeetingInfoModal';
import { MeetingReportModal } from './MeetingReportModal';
import { useLanguage, LanguageSwitcher } from '../i18n/LanguageContext';
import { PhoneOff, BarChart2, Power } from 'lucide-react';

export function ConferenceRoom({ roomId, initialUserData, onLeave }) {
  const { t } = useLanguage();
  const [self, setSelf] = useState({
    socketId: '',
    name: initialUserData.name,
    isHost: false,
    audioEnabled: initialUserData.audioEnabled,
    videoEnabled: initialUserData.videoEnabled,
    isHandRaised: false,
    avatarColor: '#3B82F6',
  });

  const [participants, setParticipants] = useState([]); // array of participant objects
  const [pinnedId, setPinnedId] = useState(null);
  const [activeSidebar, setActiveSidebar] = useState(null); // 'chat' | 'participants' | null
  const [chatMessages, setChatMessages] = useState([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [presentation, setPresentation] = useState(null); // { presenterSocketId, title, currentSlide, slides }

  // Attendance and Meeting Report states
  const [meetingReport, setMeetingReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isLiveReportPreview, setIsLiveReportPreview] = useState(false);
  const [showHostEndConfirm, setShowHostEndConfirm] = useState(false);

  const {
    localStream,
    remoteStreams,
    screenStream,
    isScreenSharing,
    isAudioMuted,
    isVideoOff,
    isSpeaking,
    isRecording,
    initLocalStream,
    connectToExistingParticipants,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    startVideoFileShare,
    stopScreenShare,
    toggleRecording,
    leaveConference,
  } = useWebRTC(roomId, initialUserData);

  // Initialize Media and Socket Connection on Mount
  useEffect(() => {
    let isMounted = true;

    async function setupRoom() {
      // 1. Get user media stream
      const stream = await initLocalStream(initialUserData.audioEnabled, initialUserData.videoEnabled);

      if (!isMounted) return;

      // 2. Connect to Socket.IO signaling server
      if (!socket.connected) {
        socket.connect();
      }

      // 3. Emit join-room
      socket.emit('join-room', {
        roomId,
        user: {
          name: initialUserData.name,
          audioEnabled: initialUserData.audioEnabled,
          videoEnabled: initialUserData.videoEnabled,
        },
      });
    }

    setupRoom();

    return () => {
      isMounted = false;
      leaveConference();
      socket.disconnect();
    };
  }, [roomId, initialUserData, initLocalStream, leaveConference]);

  // Socket event listeners for room state
  useEffect(() => {
    const handleRoomJoined = ({ self: myData, participants: existingList, presentation: roomPres, chatHistory }) => {
      setSelf(myData);
      setParticipants(existingList);
      if (roomPres) setPresentation(roomPres);
      if (chatHistory) setChatMessages(chatHistory);

      // Connect WebRTC to all existing participants
      connectToExistingParticipants(existingList);
    };

    const handleUserJoined = ({ participant }) => {
      setParticipants((prev) => {
        if (prev.some((p) => p.socketId === participant.socketId)) return prev;
        return [...prev, participant];
      });
    };

    const handleUserLeft = ({ socketId }) => {
      setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
      if (pinnedId === socketId) setPinnedId(null);
    };

    const handleUserMediaToggled = ({ socketId, mediaType, enabled }) => {
      if (socketId === self.socketId) {
        setSelf((prev) => ({
          ...prev,
          audioEnabled: mediaType === 'audio' ? enabled : prev.audioEnabled,
          videoEnabled: mediaType === 'video' ? enabled : prev.videoEnabled,
        }));
      } else {
        setParticipants((prev) =>
          prev.map((p) => {
            if (p.socketId === socketId) {
              return {
                ...p,
                audioEnabled: mediaType === 'audio' ? enabled : p.audioEnabled,
                videoEnabled: mediaType === 'video' ? enabled : p.videoEnabled,
                isScreenSharing: mediaType === 'screen' ? enabled : p.isScreenSharing,
              };
            }
            return p;
          })
        );
      }
    };

    const handleUserHandToggled = ({ socketId, isHandRaised }) => {
      if (socketId === self.socketId) {
        setSelf((prev) => ({ ...prev, isHandRaised }));
      } else {
        setParticipants((prev) =>
          prev.map((p) => (p.socketId === socketId ? { ...p, isHandRaised } : p))
        );
      }
    };

    const handleChatMessage = (message) => {
      setChatMessages((prev) => [...prev, message]);
      setActiveSidebar((curr) => {
        if (curr !== 'chat') {
          setUnreadChatCount((count) => count + 1);
        }
        return curr;
      });
    };

    const handlePresentationStarted = (presData) => {
      setPresentation(presData);
    };

    const handlePresentationStopped = () => {
      setPresentation(null);
    };

    const handlePresentationSlideUpdated = ({ slideIndex }) => {
      setPresentation((prev) => (prev ? { ...prev, currentSlide: slideIndex } : null));
    };

    const handlePresentationDeckUpdated = (presData) => {
      setPresentation(presData);
    };

    const handleForceMute = () => {
      if (!isAudioMuted) {
        toggleAudio();
        alert('Бошловчи сизнинг микрофонингизни ўчирди.');
      }
    };

    const handleKicked = () => {
      alert('Сизни бошловчи конференциядан чиқариб юборди.');
      leaveConference();
      socket.disconnect();
      onLeave();
    };

    const handleHostChanged = ({ newHostSocketId }) => {
      if (newHostSocketId === self.socketId) {
        setSelf((prev) => ({ ...prev, isHost: true }));
      } else {
        setParticipants((prev) =>
          prev.map((p) => ({
            ...p,
            isHost: p.socketId === newHostSocketId,
          }))
        );
      }
    };

    const handleMeetingEndedWithReport = ({ report }) => {
      setMeetingReport(report);
      setIsLiveReportPreview(false);
      setShowReportModal(true);
      setShowHostEndConfirm(false);
      leaveConference();
    };

    const handleMeetingReportData = (report) => {
      setMeetingReport(report);
      setShowReportModal(true);
    };

    socket.on('room-joined', handleRoomJoined);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('user-media-toggled', handleUserMediaToggled);
    socket.on('user-hand-toggled', handleUserHandToggled);
    socket.on('chat-message', handleChatMessage);
    socket.on('presentation-started', handlePresentationStarted);
    socket.on('presentation-stopped', handlePresentationStopped);
    socket.on('presentation-slide-updated', handlePresentationSlideUpdated);
    socket.on('presentation-deck-updated', handlePresentationDeckUpdated);
    socket.on('force-mute-audio', handleForceMute);
    socket.on('kicked-from-room', handleKicked);
    socket.on('host-changed', handleHostChanged);
    socket.on('meeting-ended-with-report', handleMeetingEndedWithReport);
    socket.on('meeting-report-data', handleMeetingReportData);

    return () => {
      socket.off('room-joined', handleRoomJoined);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('user-media-toggled', handleUserMediaToggled);
      socket.off('user-hand-toggled', handleUserHandToggled);
      socket.off('chat-message', handleChatMessage);
      socket.off('presentation-started', handlePresentationStarted);
      socket.off('presentation-stopped', handlePresentationStopped);
      socket.off('presentation-slide-updated', handlePresentationSlideUpdated);
      socket.off('presentation-deck-updated', handlePresentationDeckUpdated);
      socket.off('force-mute-audio', handleForceMute);
      socket.off('kicked-from-room', handleKicked);
      socket.off('host-changed', handleHostChanged);
      socket.off('meeting-ended-with-report', handleMeetingEndedWithReport);
      socket.off('meeting-report-data', handleMeetingReportData);
    };
  }, [self.socketId, isAudioMuted, toggleAudio, leaveConference, onLeave, connectToExistingParticipants, pinnedId]);

  // Handlers
  const handleRequestLeave = () => {
    if (self.isHost) {
      setShowHostEndConfirm(true);
    } else {
      onLeave();
    }
  };

  const handleEndMeetingForAll = () => {
    socket.emit('end-meeting-for-all');
    setShowHostEndConfirm(false);
  };

  const handleLeaveOnly = () => {
    setShowHostEndConfirm(false);
    onLeave();
  };

  const handleOpenLiveReport = () => {
    setIsLiveReportPreview(true);
    socket.emit('get-meeting-report');
  };

  const handleToggleRaiseHand = () => {
    const nextState = !self.isHandRaised;
    setSelf((prev) => ({ ...prev, isHandRaised: nextState }));
    socket.emit('toggle-raise-hand', { raised: nextState });
  };

  const handleSendReaction = (emoji) => {
    socket.emit('send-reaction', { emoji });
  };

  const handleSendMessage = (text) => {
    socket.emit('send-chat', { text });
  };

  const handleToggleSidebar = (sidebarName) => {
    if (activeSidebar === sidebarName) {
      setActiveSidebar(null);
    } else {
      setActiveSidebar(sidebarName);
      if (sidebarName === 'chat') {
        setUnreadChatCount(0);
      }
    }
  };

  // Presentation Toggle
  const handleTogglePresentation = () => {
    if (presentation) {
      // Stop current presentation
      socket.emit('stop-presentation');
    } else {
      // Start presentation session ready for user's real file or screen share
      socket.emit('start-presentation', {
        presentation: {
          title: 'Тақдимот намойиши',
          totalSlides: 0,
          currentSlide: 0,
          slides: [],
        },
      });
    }
  };

  const handleSlideChange = (slideIndex) => {
    socket.emit('presentation-change-slide', { slideIndex });
  };

  // Host Moderation actions
  const handleMuteParticipant = (targetSocketId) => {
    socket.emit('host-mute-participant', { targetSocketId });
  };

  const handleMuteAll = () => {
    socket.emit('host-mute-all');
  };

  const handleKickParticipant = (targetSocketId) => {
    socket.emit('host-kick-participant', { targetSocketId });
  };

  const isPresenter = presentation?.presenterSocketId === self.socketId;

  // Compute active screen sharer
  const screenSharer = isScreenSharing
    ? { isSelf: true, name: self.name, stream: screenStream }
    : participants.find((p) => p.isScreenSharing)
    ? {
        isSelf: false,
        name: participants.find((p) => p.isScreenSharing).name,
        stream: remoteStreams.get(participants.find((p) => p.isScreenSharing).socketId),
      }
    : null;

  return (
    <div className="relative w-screen h-screen bg-[#f3f4f6] flex flex-col overflow-hidden text-gray-900">
      {/* Top Header with Asfarma Logo in Top Left */}
      <div className="px-5 py-2.5 bg-white border-b border-gray-200 flex items-center justify-between z-20 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <AsfarmaLogo size="normal" showSubtitle={false} />
          <div className="h-5 w-px bg-gray-200 hidden sm:block" />
          <span className="text-xs font-semibold text-gray-600 truncate max-w-xs hidden sm:inline">
            {t.roomTitle} • {t.room}: <span className="text-orange-600 font-bold">{roomId}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />

          {/* Meeting Attendance & Camera Duration Report Button */}
          <button
            onClick={handleOpenLiveReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200 transition shadow-sm"
            title={t.viewLiveReport}
          >
            <BarChart2 className="w-3.5 h-3.5 text-orange-600" />
            <span className="hidden sm:inline">{t.meetingReport}</span>
          </button>

          <button
            onClick={() => setShowInfoModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold border border-gray-200 transition shadow-sm"
          >
            <span>{t.copyLink}</span>
          </button>

          {/* Prominent Header Leave Button: Always accessible on mobile, tablet, or desktop */}
          <button
            onClick={handleRequestLeave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-sm"
            title={t.leaveCall}
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.leaveCall}</span>
          </button>
        </div>
      </div>

      {/* Floating Reactions Overlay */}
      <ReactionsOverlay />

      {/* Main Conference Content: Video Grid / Presentation + Sidebars */}
      <div className="flex-1 flex overflow-hidden">
        {/* Center Stage: Screen Share OR Presentation OR Video Grid */}
        <div className="flex-1 h-full flex flex-col overflow-hidden">
          {screenSharer ? (
            /* Dedicated Screen Share View (PowerPoint / Window / Desktop) */
            <div className="w-full h-full flex flex-col lg:flex-row gap-3 p-3 overflow-hidden">
              <div className="flex-1 h-full min-h-[300px]">
                <ScreenShareView
                  stream={screenSharer.stream}
                  sharerName={screenSharer.name}
                  isSelf={screenSharer.isSelf}
                  onStopScreenShare={stopScreenShare}
                />
              </div>

              {/* Side Strip of Participant Video Tiles */}
              <div className="w-full lg:w-72 h-36 lg:h-full flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto shrink-0">
                <VideoGrid
                  self={self}
                  localStream={localStream}
                  participants={participants}
                  remoteStreams={remoteStreams}
                  isAudioMuted={isAudioMuted}
                  isVideoOff={isVideoOff}
                  isSpeaking={isSpeaking}
                  pinnedId={pinnedId}
                  setPinnedId={setPinnedId}
                  isPresentationActive={true}
                />
              </div>
            </div>
          ) : presentation ? (
            /* Interactive Presentation View with Synced Laser */
            <div className="w-full h-full flex flex-col lg:flex-row gap-3 p-3 overflow-hidden">
              {/* Presentation Main Screen */}
              <div className="flex-1 h-full min-h-[300px]">
                <PresentationView
                  presentation={presentation}
                  isPresenter={isPresenter}
                  onStopPresentation={() => socket.emit('stop-presentation')}
                  onSlideChange={handleSlideChange}
                  onStartScreenShare={startScreenShare}
                />
              </div>

              {/* Side Strip of Participant Video Tiles */}
              <div className="w-full lg:w-72 h-36 lg:h-full flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto shrink-0">
                <VideoGrid
                  self={self}
                  localStream={localStream}
                  participants={participants}
                  remoteStreams={remoteStreams}
                  isAudioMuted={isAudioMuted}
                  isVideoOff={isVideoOff}
                  isSpeaking={isSpeaking}
                  pinnedId={pinnedId}
                  setPinnedId={setPinnedId}
                  isPresentationActive={true}
                />
              </div>
            </div>
          ) : (
            /* Standard Adaptive Video Grid (1 - 50 participants) */
            <VideoGrid
              self={self}
              localStream={localStream}
              participants={participants}
              remoteStreams={remoteStreams}
              isAudioMuted={isAudioMuted}
              isVideoOff={isVideoOff}
              isSpeaking={isSpeaking}
              pinnedId={pinnedId}
              setPinnedId={setPinnedId}
            />
          )}
        </div>

        {/* Right Sidebars */}
        {activeSidebar === 'chat' && (
          <ChatPanel
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            onClose={() => setActiveSidebar(null)}
            currentUserId={self.socketId}
          />
        )}

        {activeSidebar === 'participants' && (
          <ParticipantsPanel
            self={self}
            participants={participants}
            isHost={self.isHost}
            onClose={() => setActiveSidebar(null)}
            onMuteParticipant={handleMuteParticipant}
            onMuteAll={handleMuteAll}
            onKickParticipant={handleKickParticipant}
            onOpenReport={handleOpenLiveReport}
          />
        )}
      </div>

      {/* Bottom Controls Bar (Zoom / Google Meet layout) */}
      <ControlsBar
        isAudioMuted={isAudioMuted}
        isVideoOff={isVideoOff}
        isScreenSharing={isScreenSharing}
        isHandRaised={self.isHandRaised}
        isRecording={isRecording}
        isPresentationActive={!!presentation}
        isPresenter={isPresenter}
        unreadChatCount={unreadChatCount}
        participantCount={participants.length + 1}
        activeSidebar={activeSidebar}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={isScreenSharing ? stopScreenShare : startScreenShare}
        onStartVideoFileShare={startVideoFileShare}
        onTogglePresentation={handleTogglePresentation}
        onToggleRaiseHand={handleToggleRaiseHand}
        onSendReaction={handleSendReaction}
        onToggleRecording={toggleRecording}
        onToggleSidebar={handleToggleSidebar}
        onOpenInfo={() => setShowInfoModal(true)}
        onLeaveCall={handleRequestLeave}
      />

      {/* Meeting Info Modal */}
      {showInfoModal && (
        <MeetingInfoModal roomId={roomId} onClose={() => setShowInfoModal(false)} />
      )}

      {/* Meeting Attendance & Camera Duration Report Modal */}
      {showReportModal && meetingReport && (
        <MeetingReportModal
          report={meetingReport}
          isLivePreview={isLiveReportPreview}
          onClose={() => setShowReportModal(false)}
          onLeaveToHome={!isLiveReportPreview ? onLeave : null}
        />
      )}

      {/* Host Confirmation Dialog: End Meeting For All vs Leave Only */}
      {showHostEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 sm:p-7 max-w-md w-full text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <PhoneOff className="w-7 h-7" />
            </div>

            <h3 className="text-xl font-black text-gray-900 mb-2">
              {t.endMeetingConfirmTitle}
            </h3>

            <p className="text-xs sm:text-sm text-gray-600 mb-6 leading-relaxed">
              {t.endMeetingConfirmDesc}
            </p>

            <div className="space-y-2.5">
              <button
                onClick={handleEndMeetingForAll}
                className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md shadow-red-500/20 transition flex items-center justify-center gap-2"
              >
                <Power className="w-4 h-4" />
                <span>{t.endForAllBtn}</span>
              </button>

              <button
                onClick={handleLeaveOnly}
                className="w-full py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-sm transition"
              >
                {t.leaveOnlyBtn}
              </button>

              <button
                onClick={() => setShowHostEndConfirm(false)}
                className="w-full py-2 px-4 rounded-xl text-gray-500 hover:text-gray-700 font-medium text-xs transition"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
