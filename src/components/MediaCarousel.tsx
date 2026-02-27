import { useMemo, useState } from 'react';
import { getVideoInfo } from '../utils/videoUtils';

interface MediaItem {
  id: string;
  media_url: string;
  media_type: 'image' | 'video';
  order_index: number;
}

interface MediaCarouselProps {
  media: MediaItem[];
  className?: string;
  style?: React.CSSProperties;
}

export default function MediaCarousel({ media, className = '', style }: MediaCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videoErrorMap, setVideoErrorMap] = useState<Record<string, boolean>>({});

  if (!media || media.length === 0) {
    return null;
  }

  const sortedMedia = [...media].sort((a, b) => a.order_index - b.order_index);
  const currentMedia = sortedMedia[currentIndex];
  const currentMediaKey = useMemo(() => `${currentMedia?.id || 'none'}:${currentMedia?.media_url || ''}`, [currentMedia]);

  const renderMedia = () => {
    if (currentMedia.media_type === 'image') {
      return (
        <img
          src={currentMedia.media_url}
          alt="Post"
          className="w-full h-full object-cover"
        />
      );
    }

    const videoInfo = getVideoInfo(currentMedia.media_url);

    if (videoInfo.type === 'youtube' || videoInfo.type === 'vimeo') {
      return (
        <div className="relative w-full h-full bg-black">
          <iframe
            src={videoInfo.embedUrl}
            className="absolute top-0 left-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Video player"
          />
        </div>
      );
    }

    if (videoErrorMap[currentMediaKey]) {
      return (
        <div className="w-full h-full bg-black flex items-center justify-center text-center px-4">
          <div className="text-white/80 text-sm">영상을 불러오지 못했어요. 다른 미디어를 확인해 주세요.</div>
        </div>
      );
    }

    return (
      <div className="w-full h-full bg-gradient-to-b from-black/70 via-black/85 to-black/70">
        <video
          src={currentMedia.media_url}
          controls
          playsInline
          preload="metadata"
          className="w-full h-full object-contain"
          onError={() => setVideoErrorMap((prev) => ({ ...prev, [currentMediaKey]: true }))}
        />
      </div>
    );
  };

  return (
    <div className={`relative ${className}`} style={style}>
      {renderMedia()}

      {sortedMedia.length > 1 && (
        <>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/35 rounded-full px-2 py-1 z-10">
            {sortedMedia.map((m, idx) => (
              <button
                key={m.id}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Go to media ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${idx === currentIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/55 hover:bg-white/80'}`}
              />
            ))}
          </div>

          <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-10">
            {currentIndex + 1} / {sortedMedia.length}
          </div>
        </>
      )}
    </div>
  );
}
