import ContentLibrary from '../components/ContentLibrary';

export default function ReelsSection({ reelRows, reelPage, setReelPage, getReelThumb, onDelete, onBulkDelete }) {
  return <ContentLibrary type="reel" rows={reelRows} page={reelPage} setPage={setReelPage} getThumbnail={getReelThumb} onDelete={onDelete} onBulkDelete={onBulkDelete} />;
}
