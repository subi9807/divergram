import { useState, useRef } from 'react';
import { X, Upload, FileText } from 'lucide-react';
import { db } from '../lib/internal-db';
import { useAuth } from '../contexts/AuthContext';

interface ReportModalProps {
  onClose: () => void;
}

export default function ReportModal({ onClose }: ReportModalProps) {
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('파일 크기는 10MB를 초과할 수 없습니다.');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('로그인이 필요합니다.');
      return;
    }

    if (!content.trim()) {
      setError('신고 내용을 입력해주세요.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      let attachmentUrl = null;

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Math.random()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await db.storage
          .from('reports')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = db.storage
          .from('reports')
          .getPublicUrl(uploadData.path);

        attachmentUrl = urlData.publicUrl;
      }

      const { error: insertError } = await db
        .from('reports')
        .insert({
          user_id: user.id,
          content: content.trim(),
          attachment_url: attachmentUrl,
          status: 'pending'
        });

      if (insertError) throw insertError;

      alert('신고가 접수되었습니다. 검토 후 조치하겠습니다.');
      onClose();
    } catch (err: any) {
      console.error('Error submitting report:', err);
      setError(err.message || '신고 제출 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-black border dark:border-gray-800 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-black border-b dark:border-gray-800 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold dark:text-white">문제 신고</h2>
          <button
            onClick={onClose}
            className="hover:bg-gray-100 dark:hover:bg-gray-900 p-2 rounded-full transition-colors"
          >
            <X className="h-5 w-5 dark:text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              신고 내용 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="신고하실 내용을 상세히 작성해주세요."
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              첨부파일 (선택사항)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,.pdf,.doc,.docx,.txt"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-500 transition-colors flex flex-col items-center justify-center space-y-2"
            >
              <Upload className="h-8 w-8 text-gray-400 dark:text-gray-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                클릭하여 파일 선택 (최대 10MB)
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                이미지, PDF, 문서 파일
              </span>
            </button>

            {file && (
              <div className="mt-2 flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <FileText className="h-5 w-5 text-blue-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              disabled={uploading}
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={uploading || !content.trim()}
            >
              {uploading ? '제출 중...' : '신고하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
