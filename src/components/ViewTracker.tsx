'use client';

import { useEffect, useRef } from 'react';
import { trackPostView } from '@/actions/trackView';

interface ViewTrackerProps {
  postId: string;
}

/**
 * ViewTracker Component
 * کامپوننت ثبت بازدید - فقط یک بار در هر session ثبت می‌شود
 */
export function ViewTracker({ postId }: ViewTrackerProps) {
  const tracked = useRef(false);

  useEffect(() => {
    console.log('🔍 [CLIENT] ViewTracker mounted for post:', postId);
    console.log('🔍 [CLIENT] Component type:', typeof window !== 'undefined' ? 'Client' : 'Server');
    console.log('🔍 [CLIENT] Tracked ref:', tracked.current);
    
    // جلوگیری از ثبت مکرر
    if (tracked.current) {
      console.log('⚠️ [CLIENT] Already tracked, skipping');
      return;
    }

    console.log('⏳ [CLIENT] Starting 2 second timer...');
    
    // تاخیر 2 ثانیه برای اطمینان از بازدید واقعی
    const timer = setTimeout(async () => {
      console.log('📊 [CLIENT] Timer fired! Tracking view for post:', postId);
      try {
        console.log('📡 [CLIENT] Calling trackPostView...');
        const result = await trackPostView(postId);
        console.log('✅ [CLIENT] View tracked successfully:', result);
        tracked.current = true;
      } catch (error) {
        console.error('❌ [CLIENT] Error tracking view:', error);
        if (error instanceof Error) {
          console.error('❌ [CLIENT] Error message:', error.message);
          console.error('❌ [CLIENT] Error stack:', error.stack);
        }
      }
    }, 2000);

    return () => {
      console.log('🧹 [CLIENT] ViewTracker cleanup');
      clearTimeout(timer);
    };
  }, [postId]);

  // رندر یک المنت مخفی برای دیباگ
  if (process.env.NODE_ENV === 'development') {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '10px',
          left: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '5px 10px',
          borderRadius: '5px',
          fontSize: '12px',
          zIndex: 9999,
        }}
      >
        ViewTracker Active: {postId.slice(0, 8)}
      </div>
    );
  }

  return null;
}
