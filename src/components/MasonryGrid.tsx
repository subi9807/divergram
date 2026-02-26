import { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle } from 'lucide-react';

interface MasonryItem {
  id: string;
  url: string;
  isVideo: boolean;
  likes: number;
  comments: number;
  aspectRatio?: number;
}

interface MasonryGridProps {
  items: MasonryItem[];
  onItemClick?: (id: string) => void;
}

export default function MasonryGrid({ items, onItemClick }: MasonryGridProps) {
  const [columns, setColumns] = useState(3);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateColumns = () => {
      if (window.innerWidth >= 768) {
        setColumns(3);
      } else {
        setColumns(2);
      }
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  const distributeItems = () => {
    const cols: MasonryItem[][] = Array.from({ length: columns }, () => []);
    const colHeights = Array(columns).fill(0);

    items.forEach((item) => {
      const shortestCol = colHeights.indexOf(Math.min(...colHeights));
      cols[shortestCol].push(item);
      const itemHeight = item.aspectRatio ? 1 / item.aspectRatio : 1;
      colHeights[shortestCol] += itemHeight;
    });

    return cols;
  };

  const columnItems = distributeItems();

  return (
    <div ref={containerRef} className="flex gap-2 md:gap-3 lg:gap-4">
      {columnItems.map((column, colIndex) => (
        <div key={colIndex} className="flex-1 flex flex-col gap-2 md:gap-3 lg:gap-4">
          {column.map((item) => (
            <div
              key={item.id}
              className="relative group cursor-pointer rounded-lg overflow-hidden bg-gray-100"
              onClick={() => onItemClick?.(item.id)}
              style={item.aspectRatio ? { aspectRatio: String(item.aspectRatio) } : undefined}
            >
              {item.isVideo ? (
                <div className="w-full h-full bg-black/70">
                  <video
                    src={item.url}
                    className="w-full h-full object-contain"
                    style={{ display: 'block' }}
                  />
                </div>
              ) : (
                <img
                  src={item.url}
                  alt="Post"
                  className="w-full h-full object-cover"
                  style={{ display: 'block' }}
                />
              )}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="text-white flex space-x-6">
                  <div className="flex items-center space-x-2">
                    <Heart className="h-5 w-5 fill-white" />
                    <span className="font-semibold">{item.likes}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="h-5 w-5 fill-white" />
                    <span className="font-semibold">{item.comments}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
