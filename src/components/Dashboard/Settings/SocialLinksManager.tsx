'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, ExternalLink, Loader2, Upload, Palette, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import {
  getAllSocialLinks,
  createSocialLink,
  updateSocialLink,
  deleteSocialLink,
  toggleSocialLink,
} from '@/actions/socialLinkActions';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import ImageUploadDialog from '@/components/ImageUpload/ImageUploadDialog';

interface SocialLink {
  id: string;
  name: string;
  url: string;
  icon: string | null;
  color: string | null;
  order: number;
  isActive: boolean;
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
  snapchat: '#FFFC00',
  aparat: '#ED145B',
};

export default function SocialLinksManager() {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Partial<SocialLink>>({});
  const [newLink, setNewLink] = useState({ name: '', url: '', icon: '', color: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [isIconDialogOpen, setIsIconDialogOpen] = useState(false);
  const [isEditIconDialogOpen, setIsEditIconDialogOpen] = useState(false);

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    setLoading(true);
    const result = await getAllSocialLinks();
    if (result.success && result.data) {
      setLinks(result.data);
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newLink.name || !newLink.url) {
      toast({ title: 'خطا', description: 'نام و لینک الزامی است', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const suggestedColor = defaultColors[newLink.name.toLowerCase()] || newLink.color;
    const result = await createSocialLink({ ...newLink, color: suggestedColor || newLink.color });
    
    if (result.success) {
      toast({ title: 'موفق', description: 'شبکه اجتماعی اضافه شد' });
      setNewLink({ name: '', url: '', icon: '', color: '' });
      setShowAddForm(false);
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
    const dataToSave = {
      ...editingData,
      icon: editingData.icon || undefined,
      color: editingData.color || undefined,
    };
    const result = await updateSocialLink(editingId, dataToSave);
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
    if (urls.length > 0) {
      setNewLink({ ...newLink, icon: urls[0] });
    }
  };

  const handleEditIconUpload = (urls: string[]) => {
    if (urls.length > 0) {
      setEditingData({ ...editingData, icon: urls[0] });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[rgb(var(--c-primary-500))]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">شبکه‌های اجتماعی</h3>
          <p className="text-sm text-gray-500">مدیریت لینک‌های شبکه‌های اجتماعی</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} className="bg-gradient-to-l from-[rgb(var(--c-primary-600))] to-[rgb(var(--c-primary-500))]">
          <Plus className="w-4 h-4 ml-2" />
          افزودن
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[rgb(var(--c-primary-50))] to-white border border-[rgb(var(--c-primary-100))] space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>نام شبکه اجتماعی</Label>
              <Input value={newLink.name} onChange={(e) => setNewLink({ ...newLink, name: e.target.value })} placeholder="مثال: تلگرام، یوتیوب" className="mt-1" />
            </div>
            <div>
              <Label>لینک یا نام کاربری</Label>
              <Input value={newLink.url} onChange={(e) => setNewLink({ ...newLink, url: e.target.value })} placeholder="https://t.me/username" className="mt-1" dir="ltr" />
            </div>
            <div>
              <Label className="flex items-center gap-2"><Upload className="w-4 h-4" />آیکون/لوگو</Label>
              <div className="flex gap-2 mt-1">
                {newLink.icon ? (
                  <div className="relative w-12 h-12 rounded-xl border overflow-hidden bg-gray-50">
                    <Image src={newLink.icon} alt="icon" fill className="object-contain p-1" />
                    <button type="button" onClick={() => setNewLink({ ...newLink, icon: '' })} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : null}
                <Button type="button" variant="outline" onClick={() => setIsIconDialogOpen(true)} className="flex-1">
                  <Upload className="w-4 h-4 ml-2" />
                  {newLink.icon ? 'تغییر آیکون' : 'آپلود آیکون'}
                </Button>
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-2"><Palette className="w-4 h-4" />رنگ برند</Label>
              <div className="flex gap-2 mt-1">
                <Input type="color" value={newLink.color || '#6366f1'} onChange={(e) => setNewLink({ ...newLink, color: e.target.value })} className="w-14 h-10 p-1 cursor-pointer" />
                <Input value={newLink.color} onChange={(e) => setNewLink({ ...newLink, color: e.target.value })} placeholder="#E4405F" className="flex-1" dir="ltr" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setShowAddForm(false); setNewLink({ name: '', url: '', icon: '', color: '' }); }}>انصراف</Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              ذخیره
            </Button>
          </div>
        </div>
      )}

      {/* Links List */}
      <div className="space-y-3">
        {links.length === 0 ? (
          <div className="text-center py-12 text-gray-500">هیچ شبکه اجتماعی‌ای اضافه نشده است</div>
        ) : (
          links.map((link) => (
            <div key={link.id} className={cn('group rounded-xl border transition-all duration-200', link.isActive ? 'bg-white border-gray-200 hover:border-[rgb(var(--c-primary-200))] hover:shadow-md' : 'bg-gray-50 border-gray-200 opacity-60')}>
              {editingId === link.id ? (
                /* Edit Mode */
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>نام</Label>
                      <Input value={editingData.name || ''} onChange={(e) => setEditingData({ ...editingData, name: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <Label>لینک</Label>
                      <Input value={editingData.url || ''} onChange={(e) => setEditingData({ ...editingData, url: e.target.value })} className="mt-1" dir="ltr" />
                    </div>
                    <div>
                      <Label>آیکون</Label>
                      <div className="flex gap-2 mt-1">
                        {editingData.icon ? (
                          <div className="relative w-12 h-12 rounded-xl border overflow-hidden bg-gray-50">
                            <Image src={editingData.icon} alt="icon" fill className="object-contain p-1" />
                            <button type="button" onClick={() => setEditingData({ ...editingData, icon: '' })} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : null}
                        <Button type="button" variant="outline" onClick={() => setIsEditIconDialogOpen(true)} className="flex-1">
                          <Upload className="w-4 h-4 ml-2" />
                          {editingData.icon ? 'تغییر' : 'آپلود'}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>رنگ</Label>
                      <div className="flex gap-2 mt-1">
                        <Input type="color" value={editingData.color || '#6366f1'} onChange={(e) => setEditingData({ ...editingData, color: e.target.value })} className="w-14 h-10 p-1" />
                        <Input value={editingData.color || ''} onChange={(e) => setEditingData({ ...editingData, color: e.target.value })} className="flex-1" dir="ltr" />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleCancelEdit}>انصراف</Button>
                    <Button onClick={handleSaveEdit} disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                      ذخیره
                    </Button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="flex items-center gap-4 p-4">
                  <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden" style={{ backgroundColor: `${link.color}20` || '#f3f4f6' }}>
                    {link.icon ? (
                      <Image src={link.icon} alt={link.name} width={28} height={28} className="object-contain" />
                    ) : (
                      <span className="font-bold text-lg" style={{ color: link.color || '#666' }}>{link.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900">{link.name}</h4>
                    <p className="text-sm text-gray-500 truncate" dir="ltr">{link.url}</p>
                  </div>
                  {link.color && <div className="w-6 h-6 rounded-full border-2 border-white shadow" style={{ backgroundColor: link.color }} title={link.color} />}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" onClick={() => handleStartEdit(link)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => window.open(link.url, '_blank')}><ExternalLink className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleToggle(link.id)}>{link.isActive ? 'غیرفعال' : 'فعال'}</Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(link.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Image Upload Dialogs */}
      <ImageUploadDialog isOpen={isIconDialogOpen} onClose={() => setIsIconDialogOpen(false)} onImageUpload={handleIconUpload} onImageRemove={() => setNewLink({ ...newLink, icon: '' })} initialPreview={newLink.icon} title="آپلود آیکون شبکه اجتماعی" />
      <ImageUploadDialog isOpen={isEditIconDialogOpen} onClose={() => setIsEditIconDialogOpen(false)} onImageUpload={handleEditIconUpload} onImageRemove={() => setEditingData({ ...editingData, icon: '' })} initialPreview={editingData.icon || ''} title="آپلود آیکون شبکه اجتماعی" />
    </div>
  );
}
