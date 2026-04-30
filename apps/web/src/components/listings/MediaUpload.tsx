/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import { X, Plus, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CldUploadWidget } from 'next-cloudinary';

interface MediaUploadProps {
  images: string[];
  onChange: (urls: string[]) => void;
  maxFiles?: number;
  error?: string;
}

export const MediaUpload: React.FC<MediaUploadProps> = ({ 
  images, 
  onChange, 
  maxFiles = 30,
  error 
}) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Local state to prevent "race conditions" during rapid-fire uploads
  const [localImages, setLocalImages] = useState<string[]>(images);

  // Sync local state with prop
  React.useEffect(() => {
    setLocalImages(images);
  }, [images]);

  // Lock body scroll when lightbox is open
  React.useEffect(() => {
    if (previewImage) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [previewImage]);

  const removeImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <AnimatePresence initial={false}>
          {localImages.map((url, index) => (
            <motion.div
              key={url}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="group relative aspect-square min-w-[140px] rounded-[2rem] overflow-hidden border-2 border-white/10 bg-white/5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Property photo ${index + 1}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              
              {/* Overlay with View and Delete */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewImage(url)}
                    className="w-10 h-10 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-white/40 transition-all shadow-lg"
                    title="View Photo"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="w-10 h-10 bg-rose-500/80 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-rose-600 transition-all shadow-lg"
                    title="Delete Photo"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {index === 0 && (
                <div className="absolute top-3 left-3 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg border border-white/20 z-10">
                  Main
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {localImages.length < maxFiles && (
          <CldUploadWidget
            uploadPreset="saudi_re_listing"
            onSuccess={(result: any) => {
              if (result.event === 'success' && result.info?.secure_url) {
                const newUrl = result.info.secure_url;
                setLocalImages(prev => {
                  const updated = [...prev, newUrl].slice(0, maxFiles);
                  onChange(updated);
                  return updated;
                });
              }
            }}
            options={{
              maxFiles: maxFiles - images.length,
              resourceType: 'image',
              clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
              cropping: true,
              croppingAspectRatio: 4/3,
              showAdvancedOptions: true,
              singleUploadAutoClose: true,
              sources: ['local', 'camera', 'url', 'google_drive', 'facebook', 'dropbox', 'instagram'],
              styles: {
                palette: {
                  window: '#0F172A',
                  sourceBg: '#1E293B',
                  windowBorder: '#334155',
                  tabIcon: '#10B981',
                  inactiveTabIcon: '#64748B',
                  menuIcons: '#F1F5F9',
                  link: '#10B981',
                  action: '#10B981',
                  inProgress: '#10B981',
                  complete: '#10B981',
                  error: '#F43F5E',
                  textDark: '#000000',
                  textLight: '#FFFFFF'
                }
              }
            }}
          >
            {(widget) => (
              <button
                type="button"
                onClick={() => {
                  if (widget && typeof widget.open === 'function') {
                    widget.open();
                  } else {
                    console.warn('Cloudinary widget not ready yet...');
                  }
                }}
                className={`aspect-square min-w-[140px] rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-all group relative overflow-hidden ${
                  maxFiles === 1 
                    ? 'bg-white/10 border-2 border-emerald-500/30 hover:border-emerald-500' 
                    : 'bg-white/5 border-4 border-dashed border-white/10 hover:bg-white/10 hover:border-emerald-500/50'
                }`}
              >
                <div className={`rounded-2xl flex items-center justify-center transition-all ${
                  maxFiles === 1 ? 'w-10 h-10 bg-emerald-500/20' : 'w-14 h-14 bg-white/5 group-hover:bg-emerald-500/20'
                }`}>
                  <Plus className={`text-emerald-500 ${maxFiles === 1 ? 'w-5 h-5' : 'w-7 h-7'}`} />
                </div>
                {maxFiles === 1 && (
                  <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500/60 group-hover:text-emerald-500">
                    Add Photo
                  </span>
                )}
              </button>
            )}
          </CldUploadWidget>
        )}
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3"
        >
          <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <p className="text-xs font-bold text-rose-500 uppercase tracking-widest">{error}</p>
        </motion.div>
      )}

      {maxFiles > 1 && (
        <div className="flex items-center gap-3 px-6 py-4 bg-white/5 rounded-2xl border border-white/10">
          <div className={`w-2 h-2 rounded-full ${images.length >= (maxFiles >= 3 ? 3 : 1) ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
            {images.length} / {maxFiles} Photos Uploaded. 
            {maxFiles >= 3 && images.length < 3 && <span className="text-amber-500/60 ml-2">Min 3 required</span>}
          </p>
        </div>
      )}

      {/* Fullscreen Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/95 flex items-center justify-center p-4 md:p-10"
            onClick={() => setPreviewImage(null)}
          >
            <button 
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-[1010]"
            >
              <X className="w-8 h-8" />
            </button>
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={previewImage} 
                alt="Preview" 
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl shadow-black/50"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
