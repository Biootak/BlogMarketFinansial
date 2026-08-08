const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const stats = {
    users: await p.user.count(),
    accounts: await p.account.count(),
    sessions: await p.session.count(),
    posts: await p.post.count(),
    categories: await p.category.count(),
    tags: await p.tag.count(),
    comments: await p.comment.count(),
    likes: await p.like.count(),
    views: await p.view.count(),
    savedPosts: await p.savedPost.count(),
    profiles: await p.profile.count(),
    notifications: await p.notification.count(),
    newsletters: await p.newsletter.count(),
    activityLogs: await p.activityLog.count(),
    rateLists: await p.rateList.count(),
    pageViews: await p.pageView.count(),
    serviceRequests: await p.serviceRequest.count(),
    socialLinks: await p.socialLink.count(),
    currencyPatterns: await p.currencyPattern.count(),
    systemLogs: await p.systemLog.count(),
    systemSettings: await p.systemSettings.count(),
  };
  console.log('آمار فعلی دیتابیس:');
  Object.entries(stats)
    .sort((a, b) => a[1] - b[1])
    .forEach(([k, v]) => console.log(`  ${k.padEnd(20)}: ${v}`));
  await p.$disconnect();
})();
