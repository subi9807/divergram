export function getRelativeTime(date: string | Date): string {
  const now = new Date();
  const postDate = new Date(date);
  const diffInMs = now.getTime() - postDate.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInSeconds < 60) {
    return '방금 전';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}분 전`;
  } else if (diffInHours < 24) {
    return `${diffInHours}시간 전`;
  } else if (diffInDays === 1) {
    return '1일 전';
  } else if (diffInDays === 2) {
    return '2일 전';
  } else if (diffInDays === 3) {
    return '3일 전';
  } else {
    const year = postDate.getFullYear();
    const month = postDate.getMonth() + 1;
    const day = postDate.getDate();
    return `${year}년 ${month}월 ${day}일`;
  }
}
