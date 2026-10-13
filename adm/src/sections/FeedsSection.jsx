import ContentLibrary from '../components/ContentLibrary';

export default function FeedsSection({ feedRows, feedPage, setFeedPage, onDelete, onBulkDelete }) {
  return <ContentLibrary type="feed" rows={feedRows} page={feedPage} setPage={setFeedPage} onDelete={onDelete} onBulkDelete={onBulkDelete} />;
}
