interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export default function DeleteConfirmModal({ isOpen, onClose, onConfirm, loading }: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-sm w-full mx-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-2 dark:text-white">게시물을 삭제하시겠습니까?</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            이 작업은 되돌릴 수 없습니다.
          </p>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="w-full py-3 text-red-500 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? '삭제 중...' : '삭제'}
          </button>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full py-3 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-white transition-colors disabled:opacity-50"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
