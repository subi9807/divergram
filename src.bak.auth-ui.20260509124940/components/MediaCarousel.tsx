import { useEffect, useRef, useState } from 'react';
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
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [mouseStartX, setMouseStartX] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const sortedMedia = [...(media || [])].sort((a, b) => a.order_index - b.order_index);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = !!entry?.isIntersecting && entry.intersectionRatio >= 0.6;
        setIsVisible(visible);
        if (!visible) {
          Object.values(videoRefs.current).forEach((v) => v?.pause());
        }
      },
      { threshold: [0, 0.3, 0.6, 1] }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      Object.values(videoRefs.current).forEach((v) => v?.pause());
    };
  }, []);

  useEffect(() => {
    const current = sortedMedia[currentIndex];
    Object.entries(videoRefs.current).forEach(([k, v]) => {
      if (!v) return;
      if (current && k === current.id && isVisible) {
        document.querySelectorAll('video').forEach((el) => {
          const video = el as HTMLVideoElement;
          if (video !== v) video.pause();
        });
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }, [currentIndex, isVisible]);

  const goToPrevious = () => setCurrentIndex((prev) => Math.max(0, prev - 1));
  const goToNext = () => setCurrentIndex((prev) => Math.min(sortedMedia.length - 1, prev + 1));

  const onTouchStart = (e: any) => setTouchStartX(e.changedTouches[0].clientX);
  const onTouchEnd = (e: any) => {
    if (touchStartX == null) return;
    const diff = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(diff) < 40) return;
    if (diff > 0) goToPrevious();
    else goToNext();
    setTouchStartX(null);
  };

  const onMouseDown = (e: any) => setMouseStartX(e.clientX);
  const onMouseUp = (e: any) => {
    if (mouseStartX == null) return;
    const diff = e.clientX - mouseStartX;
    if (Math.abs(diff) < 40) return;
    if (diff > 0) goToPrevious();
    else goToNext();
    setMouseStartX(null);
  };

  if (sortedMedia.length === 0) return null;

  return (
    <div ref={containerRef} className={`relative ${className} cursor-grab active:cursor-grabbing select-none`} style={style} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onMouseDown={onMouseDown} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onDragStart={(e) => e.preventDefault()}>
      <div className="w-full h-full overflow-hidden">
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {sortedMedia.map((m) => {
            const key = `${m.id}:${m.media_url}`;

            if (m.media_type === 'image') {
              return (
                <div key={key} className="w-full h-full shrink-0">
                  <img src={m.media_url} alt="Post" draggable={false} className="w-full h-full object-cover" />
                </div>
              );
            }

            const info = getVideoInfo(m.media_url);
            if (info.type === 'youtube' || info.type === 'vimeo') {
              return (
                <div key={key} className="w-full h-full shrink-0 bg-black relative">
                  <iframe
                    src={info.embedUrl}
                    className="absolute top-0 left-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Video player"
                  />
                </div>
              );
            }

            return (
              <div key={key} className="w-full h-full shrink-0 bg-gradient-to-b from-black/70 via-black/85 to-black/70">
                {videoErrorMap[key] ? (
                  <div className="w-full h-full bg-black flex items-center justify-center text-center px-4">
                    <div className="text-white/80 text-sm">영상을 불러오지 못했어요. 다른 미디어를 확인해 주세요.</div>
                  </div>
                ) : (
                  <video
                    ref={(el) => { videoRefs.current[m.id] = el; }}
                    src={m.media_url}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-contain"
                    data-feed-video="true"
                    onPlay={(e) => {
                      const current = e.currentTarget as HTMLVideoElement;
                      document.querySelectorAll('video').forEach((el) => {
                        const v = el as HTMLVideoElement;
                        if (v !== current) v.pause();
                      });
                    }}
                    onError={() => setVideoErrorMap((prev) => ({ ...prev, [key]: true }))}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

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
