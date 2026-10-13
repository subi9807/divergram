const messages = {
  ko: { like: '님이 게시물을 좋아합니다.', comment: '님이 댓글을 남겼습니다.', follow: '님이 회원님을 팔로우합니다.', system: '님의 새로운 활동이 있습니다.' },
  en: { like: ' liked your post.', comment: ' commented on your post.', follow: ' started following you.', system: ' has new activity.' },
  ja: { like: 'さんが投稿にいいねしました。', comment: 'さんがコメントしました。', follow: 'さんがあなたをフォローしました。', system: 'さんの新しいアクティビティがあります。' },
  zh: { like: '赞了你的帖子。', comment: '评论了你的帖子。', follow: '开始关注你了。', system: '有新的动态。' },
};

export function notificationText(type, language, actor = 'Diver') {
  const locale = String(language || 'en').split(/[-_]/)[0];
  const catalog = messages[locale] || messages.en;
  return `${actor}${catalog[type] || catalog.system}`;
}
