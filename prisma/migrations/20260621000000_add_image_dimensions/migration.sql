-- 2026-06-21: ابعاد تصاویر برای CLS-safe رندر + انتخاب variant responsive
-- همه‌ی فیلدها اختیاری هستند (nullable) تا برای رکوردهای موجود مشکلی پیش نیاید.

-- User.image
ALTER TABLE "User" ADD COLUMN "imageWidth"  INTEGER;
ALTER TABLE "User" ADD COLUMN "imageHeight" INTEGER;

-- Profile.avatar و Profile.bgImage
ALTER TABLE "Profile" ADD COLUMN "avatarWidth"   INTEGER;
ALTER TABLE "Profile" ADD COLUMN "avatarHeight"  INTEGER;
ALTER TABLE "Profile" ADD COLUMN "bgImageWidth"  INTEGER;
ALTER TABLE "Profile" ADD COLUMN "bgImageHeight" INTEGER;

-- Post.featuredImage
ALTER TABLE "Post" ADD COLUMN "featuredImageWidth"  INTEGER;
ALTER TABLE "Post" ADD COLUMN "featuredImageHeight" INTEGER;

-- Category.thumbnail
ALTER TABLE "Category" ADD COLUMN "thumbnailWidth"  INTEGER;
ALTER TABLE "Category" ADD COLUMN "thumbnailHeight" INTEGER;

-- Tag.thumbnail
ALTER TABLE "Tag" ADD COLUMN "thumbnailWidth"  INTEGER;
ALTER TABLE "Tag" ADD COLUMN "thumbnailHeight" INTEGER;

-- SocialLink.icon
ALTER TABLE "SocialLink" ADD COLUMN "iconWidth"  INTEGER;
ALTER TABLE "SocialLink" ADD COLUMN "iconHeight" INTEGER;
