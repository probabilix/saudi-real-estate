'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ChevronLeft, ChevronRight, 
  Map as MapIcon, Video, Grid,
  Phone, MessageSquare, ShieldCheck
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface MediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: string[];
  youtubeUrl?: string | null;
  initialTab?: 'photos' | 'video' | 'location';
  agent?: {
    name: string;
    avatarUrl?: string | null;
    role: string;
  };
}

export default function MediaModal({ 
  isOpen, 
  onClose, 
  photos, 
  youtubeUrl, 
  initialTab = 'photos',
  agent
}: MediaModalProps) {
  const t = useTranslations('listing');
  const [activeTab, setActiveTab] = useState<'photos' | 'video' | 'location'>(initialTab);
  const [activePhoto, setActivePhoto] = useState(0);
  const [mobileFullscreen, setMobileFullscreen] = useState(false);

  // Reset to initialTab when opening
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setActivePhoto(0);
      setMobileFullscreen(false);
    }
  }, [isOpen, initialTab]);

  // Handle Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || activeTab !== 'photos') return;
      if (e.key === 'ArrowRight') setActivePhoto((prev) => (prev + 1) % photos.length);
      if (e.key === 'ArrowLeft') setActivePhoto((prev) => (prev - 1 + photos.length) % photos.length);
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, photos.length, onClose]);

  if (!isOpen) return null;

  // Extract Video ID from various YouTube URL formats
  const getEmbedUrl = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : null;
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-charcoal flex flex-col"
      >
        {/* Header Controls */}
        <div className="h-20 px-8 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-6">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="h-6 w-px bg-white/10 hidden sm:block" />
            <div className="flex bg-white/5 p-1 rounded-full border border-white/10">
              {[
                { id: 'photos', label: t('photos'), icon: Grid },
                { id: 'video', label: t('video'), icon: Video, hidden: !youtubeUrl },
                { id: 'location', label: t('map'), icon: MapIcon },
              ].map((tab) => !tab.hidden && (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as never)}
                  className={`flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white text-charcoal' : 'text-white/60 hover:text-white'}`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-2 text-white/40 text-[10px] font-black uppercase tracking-widest">
            {activeTab === 'photos' && (
              <span>{activePhoto + 1} / {photos.length}</span>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4 md:p-12">
          {activeTab === 'photos' && (
            <>
              {/* DESKTOP: Single image with nav arrows */}
              <div className="hidden md:flex relative w-full h-full items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activePhoto}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="relative w-full h-full"
                  >
                    <Image
                      src={photos[activePhoto]}
                      alt={`Property Photo ${activePhoto + 1}`}
                      fill
                      className="object-contain"
                      unoptimized
                      priority
                    />
                  </motion.div>
                </AnimatePresence>
                {/* Always visible nav arrows on desktop */}
                <button
                  onClick={() => setActivePhoto((activePhoto - 1 + photos.length) % photos.length)}
                  className="absolute left-4 p-4 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all z-10"
                >
                  <ChevronLeft className="w-7 h-7" />
                </button>
                <button
                  onClick={() => setActivePhoto((activePhoto + 1) % photos.length)}
                  className="absolute right-4 p-4 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all z-10"
                >
                  <ChevronRight className="w-7 h-7" />
                </button>
              </div>

              {/* MOBILE: Vertical scroll of all images OR fullscreen single view */}
              <div className="md:hidden w-full h-full relative">
                {mobileFullscreen ? (
                  /* Mobile Fullscreen Single Image */
                  <div className="absolute inset-0 flex flex-col bg-black">
                    <div className="flex items-center justify-between p-3 shrink-0">
                      <button onClick={() => setMobileFullscreen(false)}
                        className="flex items-center gap-2 text-white/80 text-xs font-bold">
                        <ChevronLeft className="w-5 h-5" /> All Photos
                      </button>
                      <span className="text-white/60 text-xs font-bold">{activePhoto + 1} / {photos.length}</span>
                    </div>
                    <div className="flex-1 relative">
                      <Image src={photos[activePhoto]} alt={`Photo ${activePhoto + 1}`} fill className="object-contain" unoptimized priority />
                    </div>
                    <div className="flex items-center justify-between p-4 shrink-0">
                      <button onClick={() => setActivePhoto((activePhoto - 1 + photos.length) % photos.length)}
                        className="p-3 rounded-full bg-white/10 text-white border border-white/20">
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button onClick={() => setActivePhoto((activePhoto + 1) % photos.length)}
                        className="p-3 rounded-full bg-white/10 text-white border border-white/20">
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Mobile Vertical Scroll */
                  <div className="w-full h-full overflow-y-auto">
                    <div className="flex flex-col gap-2 p-2">
                      {photos.map((photo, idx) => (
                        <button key={idx} className="relative w-full aspect-[4/3] rounded-xl overflow-hidden shrink-0 block"
                          onClick={() => { setActivePhoto(idx); setMobileFullscreen(true); }}>
                          <Image src={photo} alt={`Photo ${idx + 1}`} fill className="object-cover" unoptimized />
                          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                            {idx + 1} / {photos.length}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}


          {activeTab === 'video' && youtubeUrl && (
            <div className="w-full h-full max-w-5xl aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black">
              <iframe 
                src={getEmbedUrl(youtubeUrl) || ''}
                className="w-full h-full"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {activeTab === 'location' && (
            <div className="w-full h-full flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-primary-500">
                <MapIcon className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white font-serif">{t('viewOnMap')}</h3>
                <p className="text-white/40 max-w-sm text-sm uppercase tracking-widest font-black">Next Build: Interactive Maps Integration Layer</p>
              </div>
              <div className="w-full max-w-4xl h-96 bg-white/5 rounded-3xl border border-dashed border-white/20 flex items-center justify-center relative grayscale opacity-40">
                 <Image src="/static-map-placeholder.jpg" alt="" fill className="object-cover" unoptimized />
                 <span className="relative z-10 text-[10px] text-white font-black uppercase tracking-[0.3em]">Map Under Compliance Review</span>
              </div>
            </div>
          )}
        </div>

        {/* Persistent Agent Footer */}
        <div className="h-24 bg-white/5 backdrop-blur-xl border-t border-white/10 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
             <div className="relative w-12 h-12 rounded-full overflow-hidden bg-primary-600 border border-white/10">
                {agent?.avatarUrl ? <Image src={agent.avatarUrl} alt="" fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white font-bold">{agent?.name?.charAt(0)}</div>}
             </div>
             <div>
                <div className="flex items-center gap-2 mb-0.5">
                   <span className="text-[10px] font-black text-primary-400 uppercase tracking-widest">TruBroker™</span>
                   <ShieldCheck className="w-3 h-3 text-primary-400" />
                </div>
                <p className="text-white font-bold text-sm">{agent?.name}</p>
             </div>
          </div>

          <div className="flex items-center gap-3">
             <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 transition-all">
                <MessageSquare className="w-4 h-4" />
                WhatsApp
             </button>
             <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-bold text-xs hover:bg-primary-700 transition-all">
                <Phone className="w-4 h-4" />
                Call Agent
             </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
