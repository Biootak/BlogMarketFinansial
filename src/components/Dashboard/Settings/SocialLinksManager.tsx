'use client';

import {
  createSocialLink,
  deleteSocialLink,
  getAllSocialLinks,
  toggleSocialLink,
  updateSocialLink,
} from '@/actions/socialLinkActions';
import ImageUploadDialog from '@/components/ImageUpload/ImageUploadDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import type { SocialLinkType } from '@prisma/client';
import {
  ExternalLink,
  GripVertical,
  Loader2,
  MessageCircle,
  Palette,
  Pencil,
  Plus,
  Share2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

interface SocialLink {
  id: string;
  name: string;
  url: string;
  icon: string | null;
  color: string | null;
  order: number;
  isActive: boolean;
  type: SocialLinkType;
}

const defaultColors: Record<string, string> = {
  telegram: '#0088cc',
  instagram: '#E4405F',
  twitter: '#1DA1F2',
  whatsapp: '#25D366',
  youtube: '#FF0000',
  linkedin: '#0A66C2',
  facebook: '#1877F2',
  tiktok: '#000000',
  pinterest: '#E60023',
  aparat: '#ED145B',
};

export default function SocialLinksManager() {
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [supportLinks, setSupportLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Partial<SocialLink>>({});
  const [newLink, setNewLink] = useState({ name: '', url: '', icon: '', color: '' });
  const [showAddForm, setShowAddForm] = useState<SocialLinkType | null>(null);
  const [isIconDialogOpen, setIsIconDialogOpen] = useState(false);
  const [isEditIconDialogOpen, setIsEditIconDialogOpen] = useState(false);

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    setLoading(true);
    const result = await getAllSocialLinks();
    if (result.success && result.data) {
      setSocialLinks(result.data.filter((l) => l.type === 'SOCIAL'));
      setSupportLinks(result.data.filter((l) => l.type === 'SUPPORT'));
    }
    setLoading(false);
  };

  const handleAdd = async (type: SocialLinkType) => {
    if (!newLink.name || !newLink.url) {
      toast({ title: 'خطا', description: 'نام و لینک الزامی است', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const suggestedColor = defaultColors[newLink.name.toLowerCase()] || newLink.color;
    const result = await createSocialLink({
      ...newLink,
      color: suggestedColor || newLink.color,
      type,
    });

    if (result.success) {
      toast({
        title: 'موفق',
        description: type === 'SUPPORT' ? 'لینک پشتیبانی اضافه شد' : 'شبکه اجتماعی اضافه شد',
      });
      setNewLink({ name: '', url: '', icon: '', color: '' });
      setShowAddForm(null);
      loadLinks();
    } else {
      toast({ title: 'خطا', description: result.error, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleStartEdit = (link: SocialLink) => {
    setEditingId(link.id);
    setEditingData({ name: link.name, url: link.url, icon: link.icon, color: link.color });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingData({});
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    const result = await updateSocialLink(editingId, {
      ...editingData,
      icon: editingData.icon || undefined,
      color: editingData.color || undefined,
    });
    if (result.success) {
      toast({ title: 'موفق', description: 'بروزرسانی شد' });
      setEditingId(null);
      setEditingData({});
      loadLinks();
    } else {
      toast({ title: 'خطا', description: result.error, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('آیا مطمئن هستید؟')) return;
    const result = await deleteSocialLink(id);
    if (result.success) {
      toast({ title: 'موفق', description: 'حذف شد' });
      loadLinks();
    } else {
      toast({ title: 'خطا', description: result.error, variant: 'destructive' });
    }
  };

  const handleToggle = async (id: string) => {
    const result = await toggleSocialLink(id);
    if (result.success) loadLinks();
  };

  const handleIconUpload = (urls: string[]) => {
    if (urls.length > 0) setNewLink({ ...newLink, icon: urls[0] });
  };

  const handleEditIconUpload = (urls: string[]) => {
    if (urls.length > 0) setEditingData({ ...editingData, icon: urls[0] });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[rgb(var(--c-primary-500))]" />
      </div>
    );
  }

  const renderAddForm = (type: SocialLinkType) => (
    <div className="p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[rgb(var(--c-primary-50))]/50 to-white/80 dark:from-neutral-800 dark:to-neutral-900 border-2 border-[rgb(var(--c-primary-100))]/60 dark:border-neutral-700 space-y-4 sm:space-y-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs sm:text-sm font-bold">
            نام {type === 'SUPPORT' ? 'پلتفرم' : 'شبکه اجتماعی'}
          </Label>
          <Input
            value={newLink.name}
            onChange={(e) => setNewLink({ ...newLink, name: e.target.value })}
            placeholder={type === 'SUPPORT' ? 'مثال: تلگرام، واتساپ' : 'مثال: اینستاگرام، یوتیوب'}
            className="rounded-xl text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs sm:text-sm font-bold">لینک</Label>
          <Input
            value={newLink.url}
            onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
            placeholder={
              type === 'SUPPORT' ? 'https://t.me/support' : 'https://instagram.com/username'
            }
            className="rounded-xl text-sm"
            dir="ltr"
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-xs sm:text-sm font-bold">
            <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            آیکون/لوگو
          </Label>
          <div className="flex gap-2">
            {newLink.icon && (
              <div className="relative w-12 h-12 rounded-xl border-2 overflow-hidden bg-gray-50 dark:bg-neutral-800 shadow-sm">
                <Image src={newLink.icon} alt="icon" fill className="object-contain p-1" />
                <button
                  type="button"
                  onClick={() => setNewLink({ ...newLink, icon: '' })}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsIconDialogOpen(true)}
              className="flex-1 rounded-xl text-xs sm:text-sm"
            >
              <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-2" />
              {newLink.icon ? 'تغییر آیکون' : 'آپلود آیکون'}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-xs sm:text-sm font-bold">
            <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            رنگ برند
          </Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={newLink.color || '#6366f1'}
              onChange={(e) => setNewLink({ ...newLink, color: e.target.value })}
              className="w-12 sm:w-14 h-10 p-1 cursor-pointer rounded-xl"
            />
            <Input
              value={newLink.color}
              onChange={(e) => setNewLink({ ...newLink, color: e.target.value })}
              placeholder="#E4405F"
              className="flex-1 rounded-xl text-sm"
              dir="ltr"
            />
          </div>
        </div>
      </div>
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200/60 dark:border-neutral-700">
        <Button
          variant="outline"
          onClick={() => {
            setShowAddForm(null);
            setNewLink({ name: '', url: '', icon: '', color: '' });
          }}
          className="rounded-xl text-xs sm:text-sm"
        >
          انصراف
        </Button>
        <Button
          onClick={() => handleAdd(type)}
          disabled={saving}
          className="rounded-xl text-xs sm:text-sm"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin ml-2" />}
          ذخیره
        </Button>
      </div>
    </div>
  );

  const renderLinkItem = (link: SocialLink) => (
    <div
      key={link.id}
      className={cn(
        'group rounded-xl sm:rounded-2xl border-2 transition-all duration-200 shadow-sm',
        link.isActive
          ? 'bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 hover:border-[rgb(var(--c-primary-200))] hover:shadow-md'
          : 'bg-gray-50 dark:bg-neutral-900 border-gray-200 dark:border-neutral-800 opacity-60',
      )}
    >
      {editingId === link.id ? (
        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm font-bold">نام</Label>
              <Input
                value={editingData.name || ''}
                onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                className="rounded-xl text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm font-bold">لینک</Label>
              <Input
                value={editingData.url || ''}
                onChange={(e) => setEditingData({ ...editingData, url: e.target.value })}
                className="rounded-xl text-sm"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm font-bold">آیکون</Label>
              <div className="flex gap-2">
                {editingData.icon && (
                  <div className="relative w-12 h-12 rounded-xl border-2 overflow-hidden bg-gray-50 dark:bg-neutral-800 shadow-sm">
                    <Image src={editingData.icon} alt="icon" fill className="object-contain p-1" />
                    <button
                      type="button"
                      onClick={() => setEditingData({ ...editingData, icon: '' })}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditIconDialogOpen(true)}
                  className="flex-1 rounded-xl text-xs sm:text-sm"
                >
                  <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-2" />
                  {editingData.icon ? 'تغییر' : 'آپلود'}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm font-bold">رنگ</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={editingData.color || '#6366f1'}
                  onChange={(e) => setEditingData({ ...editingData, color: e.target.value })}
                  className="w-12 sm:w-14 h-10 p-1 rounded-xl"
                />
                <Input
                  value={editingData.color || ''}
                  onChange={(e) => setEditingData({ ...editingData, color: e.target.value })}
                  className="flex-1 rounded-xl text-sm"
                  dir="ltr"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200/60 dark:border-neutral-700">
            <Button
              variant="outline"
              onClick={handleCancelEdit}
              className="rounded-xl text-xs sm:text-sm"
            >
              انصراف
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={saving}
              className="rounded-xl text-xs sm:text-sm"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin ml-2" />}
              ذخیره
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-4 sm:p-5">
          {/* Desktop Layout */}
          <div className="hidden sm:flex items-center gap-4">
            <GripVertical className="w-5 h-5 text-gray-400 cursor-grab shrink-0" />
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden shadow-sm shrink-0"
              style={{ backgroundColor: `${link.color}20` || '#f3f4f6' }}
            >
              {link.icon ? (
                <Image
                  src={link.icon}
                  alt={link.name}
                  width={32}
                  height={32}
                  className="object-contain"
                />
              ) : (
                <span className="font-bold text-lg" style={{ color: link.color || '#666' }}>
                  {link.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-base text-gray-900 dark:text-white">{link.name}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate" dir="ltr">
                {link.url}
              </p>
            </div>
            {link.color && (
              <div
                className="w-6 h-6 rounded-full border-2 border-white shadow shrink-0"
                style={{ backgroundColor: link.color }}
                title={link.color}
              />
            )}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStartEdit(link)}
                className="rounded-lg h-9 px-3"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(link.url, '_blank')}
                className="rounded-lg h-9 px-3"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggle(link.id)}
                className="rounded-lg h-9 px-3 text-xs"
              >
                {link.isActive ? 'غیرفعال' : 'فعال'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-lg h-9 px-3 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={() => handleDelete(link.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="sm:hidden space-y-3">
            {/* Top Row: Icon, Name, Color Badge */}
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden shadow-sm shrink-0"
                style={{ backgroundColor: `${link.color}20` || '#f3f4f6' }}
              >
                {link.icon ? (
                  <Image
                    src={link.icon}
                    alt={link.name}
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                ) : (
                  <span className="font-bold text-lg" style={{ color: link.color || '#666' }}>
                    {link.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-base text-gray-900 dark:text-white">{link.name}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate" dir="ltr">
                  {link.url}
                </p>
              </div>
              {link.color && (
                <div
                  className="w-8 h-8 rounded-full border-2 border-white shadow shrink-0"
                  style={{ backgroundColor: link.color }}
                  title={link.color}
                />
              )}
            </div>

            {/* Bottom Row: Action Buttons */}
            <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-neutral-700">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStartEdit(link)}
                className="flex-1 rounded-xl h-9 text-xs font-bold"
              >
                <Pencil className="w-3.5 h-3.5 ml-1.5" />
                ویرایش
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(link.url, '_blank')}
                className="rounded-xl h-9 px-3"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggle(link.id)}
                className="rounded-xl h-9 px-3"
                title={link.isActive ? 'غیرفعال کردن' : 'فعال کردن'}
              >
                {link.isActive ? '❌' : '✅'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl h-9 px-3 text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200 dark:hover:bg-red-950 dark:border-red-800"
                onClick={() => handleDelete(link.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Support Links Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shadow-sm">
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                لینک‌های پشتیبانی
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                لینک‌های تماس برای فرم‌های پشتیبانی و درخواست خدمات
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowAddForm(showAddForm === 'SUPPORT' ? null : 'SUPPORT')}
            variant="outline"
            className="w-full sm:w-auto rounded-xl border-2 border-green-200 text-green-600 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/30 text-xs sm:text-sm font-bold"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-2" />
            افزودن
          </Button>
        </div>

        {showAddForm === 'SUPPORT' && renderAddForm('SUPPORT')}

        <div className="space-y-3">
          {supportLinks.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-neutral-800/50 rounded-xl border border-dashed border-gray-200 dark:border-neutral-700">
              هیچ لینک پشتیبانی‌ای اضافه نشده است
            </div>
          ) : (
            supportLinks.map(renderLinkItem)
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 dark:border-neutral-700" />

      {/* Social Links Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[rgb(var(--c-primary-100))] dark:bg-[rgb(var(--c-primary-900))]/30 flex items-center justify-center shadow-sm">
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-[rgb(var(--c-primary-600))] dark:text-[rgb(var(--c-primary-400))]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                شبکه‌های اجتماعی
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                لینک‌های شبکه‌های اجتماعی برای نمایش در سایت
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowAddForm(showAddForm === 'SOCIAL' ? null : 'SOCIAL')}
            className="w-full sm:w-auto rounded-xl bg-gradient-to-l from-[rgb(var(--c-primary-600))] to-[rgb(var(--c-primary-500))] shadow-lg text-xs sm:text-sm font-bold"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-2" />
            افزودن
          </Button>
        </div>

        {showAddForm === 'SOCIAL' && renderAddForm('SOCIAL')}

        <div className="space-y-3">
          {socialLinks.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-neutral-800/50 rounded-xl border border-dashed border-gray-200 dark:border-neutral-700">
              هیچ شبکه اجتماعی‌ای اضافه نشده است
            </div>
          ) : (
            socialLinks.map(renderLinkItem)
          )}
        </div>
      </div>

      {/* Image Upload Dialogs */}
      <ImageUploadDialog
        isOpen={isIconDialogOpen}
        onClose={() => setIsIconDialogOpen(false)}
        onImageUpload={handleIconUpload}
        onImageRemove={() => setNewLink({ ...newLink, icon: '' })}
        initialPreview={newLink.icon}
        title="آپلود آیکون"
        folder="general"
      />
      <ImageUploadDialog
        isOpen={isEditIconDialogOpen}
        onClose={() => setIsEditIconDialogOpen(false)}
        onImageUpload={handleEditIconUpload}
        onImageRemove={() => setEditingData({ ...editingData, icon: '' })}
        initialPreview={editingData.icon || ''}
        title="آپلود آیکون"
        folder="general"
      />
    </div>
  );
}
