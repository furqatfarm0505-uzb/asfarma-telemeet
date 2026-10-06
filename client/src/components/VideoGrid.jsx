import React, { useMemo } from 'react';
import { VideoTile } from './VideoTile';

export function VideoGrid({
  self,
  localStream,
  participants,
  remoteStreams,
  isAudioMuted,
  isVideoOff,
  isSpeaking,
  pinnedId,
  setPinnedId,
  isPresentationActive = false,
}) {
  // Combine self + remote participants into an unified array
  const allTiles = useMemo(() => {
    const list = [
      {
        id: self.socketId,
        name: self.name,
        isSelf: true,
        isHost: self.isHost,
        audioEnabled: !isAudioMuted,
        videoEnabled: !isVideoOff,
        isSpeaking: isSpeaking,
        isHandRaised: self.isHandRaised,
        avatarColor: self.avatarColor,
        stream: localStream,
      },
    ];

    participants.forEach((p) => {
      list.push({
        id: p.socketId,
        name: p.name,
        isSelf: false,
        isHost: p.isHost,
        audioEnabled: p.audioEnabled,
        videoEnabled: p.videoEnabled,
        isSpeaking: p.isSpeaking,
        isHandRaised: p.isHandRaised,
        avatarColor: p.avatarColor,
        stream: remoteStreams.get(p.socketId),
      });
    });

    return list;
  }, [self, localStream, participants, remoteStreams, isAudioMuted, isVideoOff, isSpeaking]);

  // If someone is pinned, or if presentation is active
  const pinnedTile = useMemo(() => {
    if (!pinnedId) return null;
    return allTiles.find((t) => t.id === pinnedId) || null;
  }, [pinnedId, allTiles]);

  // Dynamic grid class based on tile count
  const getGridClass = (count) => {
    if (count === 1) return 'grid-cols-1 max-w-4xl h-full';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2 max-w-5xl h-full';
    if (count <= 4) return 'grid-cols-2 max-w-6xl h-full';
    if (count <= 6) return 'grid-cols-2 md:grid-cols-3 h-full';
    if (count <= 9) return 'grid-cols-3 h-full';
    if (count <= 16) return 'grid-cols-3 md:grid-cols-4 h-full';
    if (count <= 25) return 'grid-cols-4 md:grid-cols-5 h-full';
    return 'grid-cols-4 md:grid-cols-6 h-full';
  };

  // If a tile is pinned, show spotlight mode
  if (pinnedTile) {
    const sideTiles = allTiles.filter((t) => t.id !== pinnedId);

    return (
      <div className="w-full h-full flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
        {/* Main Pinned Center Stage */}
        <div className="flex-1 h-full min-h-[300px]">
          <VideoTile
            key={pinnedTile.id}
            stream={pinnedTile.stream}
            name={pinnedTile.name}
            isSelf={pinnedTile.isSelf}
            isHost={pinnedTile.isHost}
            audioEnabled={pinnedTile.audioEnabled}
            videoEnabled={pinnedTile.videoEnabled}
            isSpeaking={pinnedTile.isSpeaking}
            isHandRaised={pinnedTile.isHandRaised}
            isPinned={true}
            onPinToggle={() => setPinnedId(null)}
            avatarColor={pinnedTile.avatarColor}
          />
        </div>

        {/* Side Strip of other participants */}
        {sideTiles.length > 0 && (
          <div className="w-full lg:w-72 h-44 lg:h-full flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto pr-1">
            {sideTiles.map((tile) => (
              <div key={tile.id} className="min-w-[180px] lg:min-w-0 h-40 lg:h-44 shrink-0">
                <VideoTile
                  stream={tile.stream}
                  name={tile.name}
                  isSelf={tile.isSelf}
                  isHost={tile.isHost}
                  audioEnabled={tile.audioEnabled}
                  videoEnabled={tile.videoEnabled}
                  isSpeaking={tile.isSpeaking}
                  isHandRaised={tile.isHandRaised}
                  isPinned={false}
                  onPinToggle={() => setPinnedId(tile.id)}
                  avatarColor={tile.avatarColor}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Normal Grid Mode
  return (
    <div className="w-full h-full p-4 flex items-center justify-center overflow-y-auto">
      <div
        className={`w-full grid gap-4 items-center justify-center auto-rows-fr ${getGridClass(
          allTiles.length
        )}`}
        style={{ maxHeight: '100%' }}
      >
        {allTiles.map((tile) => (
          <div key={tile.id} className="w-full h-full min-h-[160px] md:min-h-[220px]">
            <VideoTile
              stream={tile.stream}
              name={tile.name}
              isSelf={tile.isSelf}
              isHost={tile.isHost}
              audioEnabled={tile.audioEnabled}
              videoEnabled={tile.videoEnabled}
              isSpeaking={tile.isSpeaking}
              isHandRaised={tile.isHandRaised}
              isPinned={false}
              onPinToggle={() => setPinnedId(tile.id)}
              avatarColor={tile.avatarColor}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
