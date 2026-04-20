import { useEffect, useRef } from 'react';
import { Edit, AlertCircle, UserPlus, UserMinus, Bookmark, ArrowRight, Share2, Info, Trash2 } from 'lucide-react';

interface PostOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReport: () => void;
  onFollow: () => void;
  onFavorite: () => void;
  onShare: () => void;
  onCopyLink: () => void;
  onEmbed: () => void;
  onGoToPost: () => void;
  onAboutAccount: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isFollowing: boolean;
  isOwnPost: boolean;
  buttonRef?: React.RefObject<HTMLButtonElement>;
}

export default function PostOptionsModal({
  isOpen,
  onClose,
  onReport,
  onFollow,
  onFavorite,
  onShare,
  onCopyLink,
  onEmbed,
  onGoToPost,
  onAboutAccount,
  onEdit,
  onDelete,
  isFollowing,
  isOwnPost,
  buttonRef,
}: PostOptionsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const options = [
    isOwnPost && onEdit && {
      label: '수정',
      icon: Edit,
      onClick: onEdit,
      className: 'font-semibold',
    },
    isOwnPost && onDelete && {
      label: '삭제',
      icon: Trash2,
      onClick: onDelete,
      className: 'text-red-500 font-semibold',
    },
    !isOwnPost && {
      label: '신고',
      icon: AlertCircle,
      onClick: onReport,
      className: 'text-red-500 font-semibold',
    },
    !isOwnPost && {
      label: isFollowing ? '팔로우 취소' : '팔로우',
      icon: isFollowing ? UserMinus : UserPlus,
      onClick: onFollow,
      className: isFollowing ? 'text-red-500 font-semibold' : '',
    },
    {
      label: '저장',
      icon: Bookmark,
      onClick: onFavorite,
    },
    {
      label: '게시물로 이동',
      icon: ArrowRight,
      onClick: onGoToPost,
    },
    {
      label: '공유',
      icon: Share2,
      onClick: onShare,
    },
    !isOwnPost && {
      label: '이 계정 정보',
      icon: Info,
      onClick: onAboutAccount,
    },
  ].filter(Boolean);

  let position = { top: 0, left: 0 };

  if (buttonRef?.current) {
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownWidth = 160;
    let left = rect.right - dropdownWidth;

    if (left < 10) {
      left = 10;
    }
    if (left + dropdownWidth > window.innerWidth - 10) {
      left = window.innerWidth - dropdownWidth - 10;
    }

    position = {
      top: rect.bottom + 8,
      left: left,
    };
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose}></div>
      <div
        ref={modalRef}
        className="fixed z-50 bg-white dark:bg-[#262626] rounded-md shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden w-[160px]"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        <div className="py-1">
          {options.map((option: any, index) => {
            const Icon = option.icon;
            return (
              <button
                key={index}
                onClick={() => {
                  option.onClick();
                }}
                className={`w-full py-2.5 px-3 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-white transition-colors flex items-center gap-2 ${
                  option.className || ''
                }`}
              >
                {Icon && <Icon size={16} />}
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
