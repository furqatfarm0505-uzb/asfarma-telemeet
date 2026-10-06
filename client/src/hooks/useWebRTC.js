import { useState, useEffect, useRef, useCallback } from 'react';
import { socket } from '../services/socket';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
};

export function useWebRTC(roomId, user) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map()); // socketId -> MediaStream
  const [screenStream, setScreenStream] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(!user?.audioEnabled);
  const [isVideoOff, setIsVideoOff] = useState(!user?.videoEnabled);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const peerConnections = useRef(new Map()); // socketId -> RTCPeerConnection
  const pendingCandidates = useRef(new Map()); // socketId -> RTCIceCandidate[]
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // Initialize Local Media Stream
  const initLocalStream = useCallback(async (audio = true, video = true) => {
    try {
      // Request media with audio and video
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
        });
      } catch (camErr) {
        console.warn('[WebRTC] Camera unavailable, requesting audio only:', camErr);
        // Fallback: Audio only + generate dummy black canvas video track
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });

        // Create black dummy video track so the WebRTC video transceiver is always established!
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1e2024';
        ctx.fillRect(0, 0, 640, 480);
        const dummyStream = canvas.captureStream(1);
        const dummyTrack = dummyStream.getVideoTracks()[0];
        dummyTrack.enabled = false;

        audioStream.addTrack(dummyTrack);
        stream = audioStream;
      }

      // Apply initial mute/unmute settings
      stream.getAudioTracks().forEach((track) => {
        track.enabled = audio;
      });
      stream.getVideoTracks().forEach((track) => {
        track.enabled = video;
      });

      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsAudioMuted(!audio);
      setIsVideoOff(!video);

      // Voice Activity Detection
      setupVoiceActivity(stream);

      return stream;
    } catch (err) {
      console.error('[WebRTC] All media devices failed:', err);
      const emptyStream = new MediaStream();
      localStreamRef.current = emptyStream;
      setLocalStream(emptyStream);
      setIsAudioMuted(true);
      setIsVideoOff(true);
      return emptyStream;
    }
  }, []);

  // Voice Activity Detection via Web Audio API
  const setupVoiceActivity = (stream) => {
    try {
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) return;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let speakingCounter = 0;
      const checkAudio = () => {
        if (!audioTrack.enabled || audioTrack.readyState === 'ended') {
          setIsSpeaking(false);
          requestAnimationFrame(checkAudio);
          return;
        }

        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        if (average > 18) {
          speakingCounter = Math.min(speakingCounter + 1, 8);
        } else {
          speakingCounter = Math.max(speakingCounter - 1, 0);
        }

        setIsSpeaking(speakingCounter > 2);
        requestAnimationFrame(checkAudio);
      };

      checkAudio();
    } catch (e) {
      console.warn('Audio analyser setup failed:', e);
    }
  };

  // Create RTCPeerConnection for a remote peer
  const createPeerConnection = useCallback((targetSocketId, isInitiator) => {
    if (peerConnections.current.has(targetSocketId)) {
      return peerConnections.current.get(targetSocketId);
    }

    console.log(`[WebRTC] Creating PeerConnection with ${targetSocketId} (isInitiator=${isInitiator})`);
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.current.set(targetSocketId, pc);

    // Add local tracks to peer connection
    // If screen share is active, prioritize screen video track, otherwise send camera video track
    const currentStream = localStreamRef.current;
    if (currentStream) {
      const audioTrack = currentStream.getAudioTracks()[0];
      if (audioTrack) {
        pc.addTrack(audioTrack, currentStream);
      }
    }

    const activeVideoTrack = screenStreamRef.current?.getVideoTracks()[0] || localStreamRef.current?.getVideoTracks()[0];
    if (activeVideoTrack) {
      pc.addTrack(activeVideoTrack, screenStreamRef.current || localStreamRef.current);
    }

    // ICE Candidate event
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    // On Track received from remote peer
    pc.ontrack = (event) => {
      console.log(`[WebRTC] Received ${event.track.kind} track from ${targetSocketId}`);
      setRemoteStreams((prev) => {
        const existing = prev.get(targetSocketId);
        let updatedStream;
        if (!existing) {
          updatedStream = new MediaStream([event.track]);
        } else {
          // Clone existing tracks and append/replace the incoming track in a new MediaStream instance
          const otherTracks = existing.getTracks().filter((t) => t.id !== event.track.id);
          updatedStream = new MediaStream([...otherTracks, event.track]);
        }
        const updated = new Map(prev);
        updated.set(targetSocketId, updatedStream);
        return updated;
      });
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] State with ${targetSocketId}: ${pc.connectionState}`);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        cleanupPeer(targetSocketId);
      }
    };

    // If initiator, send offer directly
    if (isInitiator) {
      (async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('signal-offer', { targetSocketId, offer });
        } catch (err) {
          console.error('[WebRTC] Error creating offer:', err);
        }
      })();
    }

    return pc;
  }, []);

  const cleanupPeer = useCallback((targetSocketId) => {
    const pc = peerConnections.current.get(targetSocketId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(targetSocketId);
    }
    pendingCandidates.current.delete(targetSocketId);
    setRemoteStreams((prev) => {
      const updated = new Map(prev);
      updated.delete(targetSocketId);
      return updated;
    });
  }, []);

  // WebRTC Signaling Listeners
  useEffect(() => {
    // When existing users receive user-joined: DO NOT initiate! New user will initiate!
    const handleUserJoined = ({ participant }) => {
      console.log(`[WebRTC] Existing user noticed new user: ${participant.name} (${participant.socketId})`);
      createPeerConnection(participant.socketId, false);
    };

    // Receive Offer from a peer
    const handleSignalOffer = async ({ senderSocketId, offer }) => {
      console.log(`[WebRTC] Received offer from ${senderSocketId}`);
      let pc = peerConnections.current.get(senderSocketId);
      if (!pc) {
        pc = createPeerConnection(senderSocketId, false);
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Process queued ICE candidates
        const candidates = pendingCandidates.current.get(senderSocketId) || [];
        for (const candidate of candidates) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidates.current.delete(senderSocketId);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('signal-answer', {
          targetSocketId: senderSocketId,
          answer,
        });
      } catch (err) {
        console.error('[WebRTC] Error handling offer:', err);
      }
    };

    // Receive Answer from a peer
    const handleSignalAnswer = async ({ senderSocketId, answer }) => {
      console.log(`[WebRTC] Received answer from ${senderSocketId}`);
      const pc = peerConnections.current.get(senderSocketId);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));

          // Process queued ICE candidates
          const candidates = pendingCandidates.current.get(senderSocketId) || [];
          for (const candidate of candidates) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
          pendingCandidates.current.delete(senderSocketId);
        } catch (err) {
          console.error('[WebRTC] Error setting remote answer:', err);
        }
      }
    };

    // Receive ICE Candidate
    const handleIceCandidate = async ({ senderSocketId, candidate }) => {
      const pc = peerConnections.current.get(senderSocketId);
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('[WebRTC] Error adding ICE candidate:', err);
        }
      } else {
        if (!pendingCandidates.current.has(senderSocketId)) {
          pendingCandidates.current.set(senderSocketId, []);
        }
        pendingCandidates.current.get(senderSocketId).push(candidate);
      }
    };

    const handleUserLeft = ({ socketId }) => {
      cleanupPeer(socketId);
    };

    socket.on('user-joined', handleUserJoined);
    socket.on('signal-offer', handleSignalOffer);
    socket.on('signal-answer', handleSignalAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('user-left', handleUserLeft);

    return () => {
      socket.off('user-joined', handleUserJoined);
      socket.off('signal-offer', handleSignalOffer);
      socket.off('signal-answer', handleSignalAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('user-left', handleUserLeft);
    };
  }, [createPeerConnection, cleanupPeer]);

  // Connect to existing participants: NEW user initiates to all existing participants!
  const connectToExistingParticipants = useCallback((participants) => {
    console.log(`[WebRTC] New user connecting to ${participants.length} existing participants`);
    participants.forEach((p) => {
      createPeerConnection(p.socketId, true);
    });
  }, [createPeerConnection]);

  // Toggle Audio (Mute / Unmute)
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const nextState = !audioTracks[0].enabled;
        audioTracks.forEach((track) => {
          track.enabled = nextState;
        });
        setIsAudioMuted(!nextState);
        socket.emit('toggle-media', { mediaType: 'audio', enabled: nextState });
      }
    }
  }, []);

  // Toggle Video (Camera On / Off)
  const toggleVideo = useCallback(async () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const nextState = !videoTracks[0].enabled;
        videoTracks.forEach((track) => {
          track.enabled = nextState;
        });
        setIsVideoOff(!nextState);
        socket.emit('toggle-media', { mediaType: 'video', enabled: nextState });
      } else {
        // Video track was not initially granted, request camera
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
          const newVideoTrack = videoStream.getVideoTracks()[0];
          localStreamRef.current.addTrack(newVideoTrack);

          // Replace track in senders or renegotiate
          peerConnections.current.forEach(async (pc) => {
            const senders = pc.getSenders();
            const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
            if (videoSender) {
              await videoSender.replaceTrack(newVideoTrack);
            } else {
              pc.addTrack(newVideoTrack, localStreamRef.current);
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              for (const [id, conn] of peerConnections.current.entries()) {
                if (conn === pc) {
                  socket.emit('signal-offer', { targetSocketId: id, offer });
                }
              }
            }
          });

          setIsVideoOff(false);
          socket.emit('toggle-media', { mediaType: 'video', enabled: true });
        } catch (err) {
          console.error('Failed to enable video:', err);
        }
      }
    }
  }, []);

  // Start Screen Sharing
  const startScreenShare = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        alert('Браузерингизда экран намойиши чекланган ёки қўллаб-қувватланмайди. Компьютер ёки ноутбук орқали (Chrome, Edge) экран улашинг.');
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: true,
      });

      screenStreamRef.current = stream;
      setScreenStream(stream);
      setIsScreenSharing(true);

      const screenTrack = stream.getVideoTracks()[0];

      // Replace video track in peer connections with screen track
      for (const [targetSocketId, pc] of peerConnections.current.entries()) {
        try {
          const transceivers = pc.getTransceivers();
          const videoTransceiver = transceivers.find(
            (t) => t.receiver?.track?.kind === 'video' || t.sender?.track?.kind === 'video'
          );

          if (videoTransceiver && videoTransceiver.sender) {
            videoTransceiver.direction = 'sendrecv';
            await videoTransceiver.sender.replaceTrack(screenTrack);
          } else {
            const senders = pc.getSenders();
            const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
            if (videoSender) {
              await videoSender.replaceTrack(screenTrack);
            } else {
              pc.addTrack(screenTrack, stream);
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.emit('signal-offer', { targetSocketId, offer });
            }
          }
        } catch (peerErr) {
          console.error(`[WebRTC] Failed to send screen track to peer ${targetSocketId}:`, peerErr);
        }
      }

      // When browser native 'Stop sharing' bar is clicked
      screenTrack.onended = () => {
        stopScreenShare();
      };

      socket.emit('toggle-media', { mediaType: 'screen', enabled: true });
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        console.warn('Screen share canceled or failed:', err);
      }
    }
  }, []);

  // Stream a local video file (MP4, WebM, MKV) directly into WebRTC
  const startVideoFileShare = useCallback(async (file) => {
    try {
      const videoElement = document.createElement('video');
      videoElement.src = URL.createObjectURL(file);
      videoElement.playsInline = true;
      videoElement.loop = true;
      videoElement.muted = true; // Mute locally to prevent feedback loop
      await videoElement.play();

      let stream;
      if (videoElement.captureStream) {
        stream = videoElement.captureStream();
      } else if (videoElement.mozCaptureStream) {
        stream = videoElement.mozCaptureStream();
      }

      if (!stream) {
        alert('Браузерингиз видео стримингни қўллаб-қувватламайди');
        return;
      }

      screenStreamRef.current = stream;
      setScreenStream(stream);
      setIsScreenSharing(true);

      const screenTrack = stream.getVideoTracks()[0];

      // Replace video track in peer connections with video file track
      peerConnections.current.forEach(async (pc) => {
        const senders = pc.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(screenTrack);
        } else {
          pc.addTrack(screenTrack, stream);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          for (const [id, conn] of peerConnections.current.entries()) {
            if (conn === pc) {
              socket.emit('signal-offer', { targetSocketId: id, offer });
            }
          }
        }
      });

      screenTrack.onended = () => {
        stopScreenShare();
      };

      socket.emit('toggle-media', { mediaType: 'screen', enabled: true });
    } catch (err) {
      console.warn('Video file share failed:', err);
    }
  }, []);

  // Stop Screen Sharing
  const stopScreenShare = useCallback(async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      setScreenStream(null);
      setIsScreenSharing(false);

      // Restore camera video track in peer connections
      const cameraTrack = localStreamRef.current?.getVideoTracks()[0] || null;
      for (const [targetSocketId, pc] of peerConnections.current.entries()) {
        try {
          const transceivers = pc.getTransceivers();
          const videoTransceiver = transceivers.find(
            (t) => t.receiver?.track?.kind === 'video' || t.sender?.track?.kind === 'video'
          );
          if (videoTransceiver && videoTransceiver.sender) {
            await videoTransceiver.sender.replaceTrack(cameraTrack);
          } else {
            const senders = pc.getSenders();
            const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
            if (videoSender) {
              await videoSender.replaceTrack(cameraTrack);
            }
          }
        } catch (e) {
          console.warn(`[WebRTC] Error restoring camera track for ${targetSocketId}:`, e);
        }
      }

      socket.emit('toggle-media', { mediaType: 'screen', enabled: false });
    }
  }, []);

  // Record Meeting (Video + Audio)
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      const streamToRecord = screenStreamRef.current || localStreamRef.current;
      if (!streamToRecord) return;

      try {
        const options = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? { mimeType: 'video/webm;codecs=vp9' }
          : { mimeType: 'video/webm' };

        const recorder = new MediaRecorder(streamToRecord, options);
        recordedChunksRef.current = [];

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `conference-recording-${new Date().toISOString().slice(0, 19)}.webm`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          }, 100);
        };

        recorder.start(1000);
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch (err) {
        console.error('Error starting media recorder:', err);
      }
    }
  }, [isRecording]);

  // Teardown everything
  const leaveConference = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();
    setRemoteStreams(new Map());
  }, []);

  return {
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
  };
}
