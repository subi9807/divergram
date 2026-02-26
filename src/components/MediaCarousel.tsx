import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

  if (!media || media.length === 0) {
    return null;
  }

  const sortedMedia = [...media].sort((a, b) => a.order_index - b.order_index);
  const currentMedia = sortedMedia[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? sortedMedia.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === sortedMedia.length - 1 ? 0 : prev + 1));
  };

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

    return (
      <div className="w-full h-full bg-gradient-to-b from-black/70 via-black/85 to-black/70">
        <video
          src={currentMedia.media_url}
          controls
          playsInline
          preload="metadata"
          className="w-full h-full object-contain"
        />
      </div>
    );
  };

  return (
    <div className={`relative ${className}`} style={style}>
      {renderMedia()}

      {sortedMedia.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-1.5 shadow-md transition-all z-10"
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4 text-gray-800" />
          </button>

          <button
            onClick={goToNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-1.5 shadow-md transition-all z-10"
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4 text-gray-800" />
          </button>

          <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-10">
            {currentIndex + 1} / {sortedMedia.length}
          </div>
        </>
      )}
    </div>
  );
}
