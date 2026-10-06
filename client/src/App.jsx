import React, { useState, useEffect } from 'react';
import { Home } from './components/Home';
import { Lobby } from './components/Lobby';
import { ConferenceRoom } from './components/ConferenceRoom';
import { LanguageProvider } from './i18n/LanguageContext';

function generateRoomId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part1}-${part2}-${part3}`;
}

function MainApp() {
  const [stage, setStage] = useState('home'); // 'home' | 'lobby' | 'conference'
  const [roomId, setRoomId] = useState('');
  const [userData, setUserData] = useState(null);

  // Check URL query on mount for direct meeting links (e.g., ?room=abc-defg-hij)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setRoomId(roomParam);
      setStage('lobby');
    }
  }, []);

  // 1. Start new meeting
  const handleStartNewMeeting = () => {
    const newId = generateRoomId();
    setRoomId(newId);
    window.history.pushState(null, '', `?room=${newId}`);
    setStage('lobby');
  };

  // 2. Join with code from home page
  const handleJoinWithCode = (code) => {
    setRoomId(code);
    window.history.pushState(null, '', `?room=${code}`);
    setStage('lobby');
  };

  // 3. From Lobby into Conference Room
  const handleJoinConference = (userParams) => {
    setUserData(userParams);
    setStage('conference');
  };

  // 4. Leave Conference
  const handleLeaveCall = () => {
    setUserData(null);
    setRoomId('');
    window.history.pushState(null, '', window.location.pathname);
    setStage('home');
  };

  if (stage === 'conference' && userData && roomId) {
    return (
      <ConferenceRoom
        roomId={roomId}
        initialUserData={userData}
        onLeave={handleLeaveCall}
      />
    );
  }

  if (stage === 'lobby' && roomId) {
    return (
      <Lobby
        roomId={roomId}
        onJoinRoom={handleJoinConference}
      />
    );
  }

  return (
    <Home
      onStartNewMeeting={handleStartNewMeeting}
      onJoinWithCode={handleJoinWithCode}
    />
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <MainApp />
    </LanguageProvider>
  );
}
