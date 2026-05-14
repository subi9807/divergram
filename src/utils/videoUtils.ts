export type VideoType = 'youtube' | 'vimeo' | 'file';

export interface VideoInfo {
  type: VideoType;
  embedUrl: string;
  originalUrl: string;
}

export function getVideoInfo(url: string): VideoInfo {
  if (!url) {
    return {
      type: 'file',
      embedUrl: url,
      originalUrl: url
    };
  }

  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = '';

    if (url.includes('youtube.com/embed/')) {
      videoId = url.split('youtube.com/embed/')[1]?.split('?')[0] || '';
    } else if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('v=')[1]?.split('&')[0] || '';
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
    }

    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      originalUrl: url
    };
  }

  if (url.includes('vimeo.com')) {
    let videoId = '';

    if (url.includes('vimeo.com/')) {
      const parts = url.split('vimeo.com/');
      videoId = parts[1]?.split('/')[0]?.split('?')[0] || '';
    }

    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
      originalUrl: url
    };
  }

  return {
    type: 'file',
    embedUrl: url,
    originalUrl: url
  };
}

export function isVideoFile(url: string): boolean {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.MP4', '.WEBM', '.OGG', '.MOV', '.AVI', '.MKV'];
  return videoExtensions.some(ext => url.includes(ext));
}
