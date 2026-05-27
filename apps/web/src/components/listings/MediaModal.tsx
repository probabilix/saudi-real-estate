'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { 
  X, ChevronLeft, ChevronRight, 
  Map as MapIcon, Video, Grid,
  Phone, MessageSquare, ShieldCheck, Zap,
  BookOpen, Plus, Minus
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface MediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: string[];
  youtubeUrl?: string | null;
  brochureUrl?: string | null;
  mapEmbedUrl?: string | null;
  initialTab?: 'photos' | 'brochure' | 'video' | 'location';
  isQualified?: boolean;
  onContactAttempt?: (type: 'phone' | 'email' | 'whatsapp') => void;
  agent?: {
    name: string;
    avatarUrl?: string | null;
    role: string;
    phone?: string;
  };
}

export default function MediaModal({ 
  isOpen, 
  onClose, 
  photos, 
  youtubeUrl, 
  brochureUrl,
  mapEmbedUrl,
  initialTab = 'photos',
  isQualified = false,
  onContactAttempt,
  agent
}: MediaModalProps) {
  const t = useTranslations('listing');
  const [activeTab, setActiveTab] = useState<'photos' | 'brochure' | 'video' | 'location'>(
    initialTab === 'photos' || initialTab === 'brochure' || initialTab === 'video' || initialTab === 'location'
      ? initialTab
      : 'photos'
  );
  const [activePhoto, setActivePhoto] = useState(0);
  const [mobileFullscreen, setMobileFullscreen] = useState(false);
  const [photoScale, setPhotoScale] = useState(1);

  // Brochure page states
  const [brochurePage, setBrochurePage] = useState(1);
  const [brochureMaxPages, setBrochureMaxPages] = useState(50);
  const [cloudinaryError, setCloudinaryError] = useState(false);
  const [turnDirection, setTurnDirection] = useState<'next' | 'prev'>('next');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  const handleZoomIn = () => setPhotoScale((prev) => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => setPhotoScale((prev) => Math.max(prev - 0.5, 1));
  const handleZoomReset = () => {
    setPhotoScale(1);
    dragX.set(0);
    dragY.set(0);
  };

  const handleDoubleTap = () => {
    if (photoScale > 1) {
      handleZoomReset();
    } else {
      setPhotoScale(2);
    }
  };

  const handleNextPage = () => {
    setTurnDirection('next');
    if (isMobile) {
      setBrochurePage((prev) => Math.min(prev + 1, brochureMaxPages));
    } else {
      if (brochurePage === 1) {
        setBrochurePage(2);
      } else {
        setBrochurePage((prev) => Math.min(prev + 2, brochureMaxPages));
      }
    }
  };

  const handlePrevPage = () => {
    setTurnDirection('prev');
    if (isMobile) {
      setBrochurePage((prev) => Math.max(prev - 1, 1));
    } else {
      if (brochurePage === 2) {
        setBrochurePage(1);
      } else {
        setBrochurePage((prev) => Math.max(prev - 2, 1));
      }
    }
  };

  // Reset zoom scale & brochure states when photo or tab changes or opening
  useEffect(() => {
    setPhotoScale(1);
    dragX.set(0);
    dragY.set(0);
    setBrochurePage(1);
    setBrochureMaxPages(50);
    setCloudinaryError(false);
  }, [activePhoto, activeTab, isOpen, dragX, dragY]);

  // Reset to initialTab when opening
  useEffect(() => {
    if (isOpen) {
      const tab = (initialTab === 'photos' || initialTab === 'brochure' || initialTab === 'video' || initialTab === 'location') 
        ? initialTab 
        : 'photos';
      setActiveTab(tab);
      setActivePhoto(0);
      setMobileFullscreen(false);
    }
  }, [isOpen, initialTab]);

  // Handle Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (activeTab === 'photos') {
        if (e.key === 'ArrowRight') setActivePhoto((prev) => (prev + 1) % photos.length);
        if (e.key === 'ArrowLeft') setActivePhoto((prev) => (prev - 1 + photos.length) % photos.length);
      } else if (activeTab === 'brochure') {
        if (e.key === 'ArrowRight') handleNextPage();
        if (e.key === 'ArrowLeft') handlePrevPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, photos.length, onClose, brochurePage, brochureMaxPages, isMobile]);

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
            <div className="flex bg-white/5 p-1 rounded-full border border-white/10 overflow-x-auto max-w-[calc(100vw-8rem)] scrollbar-none">
              {[
                { id: 'photos', label: t('photos'), icon: Grid },
                { id: 'brochure', label: t('brochure'), icon: BookOpen, hidden: !brochureUrl },
                { id: 'video', label: t('video'), icon: Video, hidden: !youtubeUrl },
                { id: 'location', label: t('map'), icon: MapIcon },
              ].map((tab) => !tab.hidden && (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === tab.id ? 'bg-white text-charcoal' : 'text-white/60 hover:text-white'}`}
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
              {/* DESKTOP: Single image with nav arrows & drag/swipe support */}
              <div className="hidden md:flex relative w-full h-full items-center justify-center overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activePhoto}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="relative w-full h-full flex items-center justify-center"
                    drag={photoScale === 1 ? "x" : false}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.6}
                    onDragEnd={(event, info) => {
                      if (photoScale > 1) return;
                      const swipeThreshold = 50;
                      if (info.offset.x < -swipeThreshold) {
                        setActivePhoto((prev) => (prev + 1) % photos.length);
                      } else if (info.offset.x > swipeThreshold) {
                        setActivePhoto((prev) => (prev - 1 + photos.length) % photos.length);
                      }
                    }}
                  >
                    <motion.div
                      drag={photoScale > 1}
                      dragConstraints={{ 
                        left: -300 * (photoScale - 1), 
                        right: 300 * (photoScale - 1), 
                        top: -200 * (photoScale - 1), 
                        bottom: 200 * (photoScale - 1) 
                      }}
                      dragElastic={0.1}
                      style={{ x: dragX, y: dragY, scale: photoScale }}
                      onDoubleClick={handleDoubleTap}
                      className="relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
                    >
                      <Image
                        src={photos[activePhoto]}
                        alt={`Property Photo ${activePhoto + 1}`}
                        fill
                        className="object-contain pointer-events-none"
                        unoptimized
                        priority
                      />
                    </motion.div>
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

              {/* MOBILE: Vertical scroll of all images OR fullscreen single view with swipable gestures */}
              <div className="md:hidden w-full h-full relative">
                {mobileFullscreen ? (
                  /* Mobile Fullscreen Single Image with horizontal swipe gesture */
                  <div className="absolute inset-0 flex flex-col bg-black">
                    <div className="flex items-center justify-between p-3 shrink-0">
                      <button onClick={() => setMobileFullscreen(false)}
                        className="flex items-center gap-2 text-white/80 text-xs font-bold">
                        <ChevronLeft className="w-5 h-5" /> All Photos
                      </button>
                      <span className="text-white/60 text-xs font-bold">{activePhoto + 1} / {photos.length}</span>
                    </div>
                    <div className="flex-1 relative overflow-hidden flex items-center justify-center">
                      <motion.div
                        key={activePhoto}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute inset-0 flex items-center justify-center"
                        drag={photoScale === 1 ? "x" : false}
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.6}
                        onDragEnd={(event, info) => {
                          if (photoScale > 1) return;
                          const swipeThreshold = 50;
                          if (info.offset.x < -swipeThreshold) {
                            setActivePhoto((prev) => (prev + 1) % photos.length);
                          } else if (info.offset.x > swipeThreshold) {
                            setActivePhoto((prev) => (prev - 1 + photos.length) % photos.length);
                          }
                        }}
                      >
                        <motion.div
                          drag={photoScale > 1}
                          dragConstraints={{ 
                            left: -200 * (photoScale - 1), 
                            right: 200 * (photoScale - 1), 
                            top: -150 * (photoScale - 1), 
                            bottom: 150 * (photoScale - 1) 
                          }}
                          dragElastic={0.1}
                          style={{ x: dragX, y: dragY, scale: photoScale }}
                          onDoubleClick={handleDoubleTap}
                          className="relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
                        >
                          <Image 
                            src={photos[activePhoto]} 
                            alt={`Photo ${activePhoto + 1}`} 
                            fill 
                            className="object-contain pointer-events-none" 
                            unoptimized 
                            priority 
                          />
                        </motion.div>
                      </motion.div>
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
                          <Image src={photo} alt={`Photo ${idx + 1}`} fill className="object-cover pointer-events-none" unoptimized />
                          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                            {idx + 1} / {photos.length}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Floating Zoom Toolbar for desktop and mobile fullscreen single photo */}
              <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 items-center gap-2 bg-charcoal/90 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 z-20 shadow-2xl ${mobileFullscreen ? 'flex' : 'hidden md:flex'}`}>
                  <button 
                    onClick={handleZoomOut}
                    disabled={photoScale <= 1}
                    className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white disabled:opacity-40"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] font-black text-white min-w-[40px] text-center uppercase tracking-wider font-sans">
                    {Math.round(photoScale * 100)}%
                  </span>
                  <button 
                    onClick={handleZoomIn}
                    disabled={photoScale >= 4}
                    className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white disabled:opacity-40"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  {photoScale > 1 && (
                    <button 
                      onClick={handleZoomReset}
                      className="text-[9px] font-black text-primary-400 hover:text-primary-300 uppercase tracking-widest pl-3 border-l border-white/10 font-sans"
                    >
                      Reset
                    </button>
                  )}
                </div>
            </>
          )}

          {activeTab === 'brochure' && brochureUrl && (() => {
            const pdfSrc = brochureUrl;
            const isCloudinary = pdfSrc.includes('res.cloudinary.com');
            const useCloudinaryBooklet = isCloudinary && !cloudinaryError;

            // Build absolute embed URL based on hosting provider
            const getBrochureEmbedUrl = (url: string) => {
              if (url.includes('drive.google.com')) {
                const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
                if (match && match[1]) {
                  return `https://drive.google.com/file/d/${match[1]}/preview`;
                }
              }
              return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
            };

            const embedSrc = getBrochureEmbedUrl(pdfSrc);

            const getDownloadUrl = (url: string) => {
              if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
                return url.replace('/upload/', '/upload/fl_attachment/');
              }
              return url;
            };
            const downloadUrl = getDownloadUrl(pdfSrc);

            // Cloudinary PDF page slicing URL generation with cache/version preservation
            const getCloudinaryPageUrl = (url: string, pageNumber: number) => {
              if (!url.includes('res.cloudinary.com')) return url;
              let cleanUrl = url.split('?')[0]; // Remove queries
              if (cleanUrl.endsWith('.pdf')) {
                cleanUrl = cleanUrl.slice(0, -4) + '.jpg';
              }
              if (cleanUrl.includes('/upload/')) {
                if (/\/upload\/pg_\d+\//.test(cleanUrl)) {
                  cleanUrl = cleanUrl.replace(/\/upload\/pg_\d+\//, `/upload/pg_${pageNumber}/`);
                } else {
                  cleanUrl = cleanUrl.replace('/upload/', `/upload/pg_${pageNumber}/`);
                }
              }
              return cleanUrl;
            };

            const handlePageError = (errPage: number) => {
              console.log(`Failed loading page: ${errPage}`);
              if (errPage === 1) {
                setCloudinaryError(true);
              } else {
                setBrochureMaxPages((prev) => Math.min(prev, errPage - 1));
                setBrochurePage((prev) => {
                  if (prev >= errPage) {
                    return isMobile ? Math.max(1, errPage - 1) : (errPage - 2 > 1 ? errPage - 2 : 1);
                  }
                  return prev;
                });
              }
            };

            return (
              <div className="w-full h-full max-w-5xl flex flex-col space-y-4">
                {/* Top header options */}
                <div className="flex items-center justify-between text-white shrink-0">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary-400" />
                    <span className="text-xs font-black uppercase tracking-[0.2em] font-sans">
                      {useCloudinaryBooklet ? 'Interactive Digital Brochure' : 'Digital Brochure Booklet'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={pdfSrc}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-wider transition-all text-white"
                    >
                      Open Direct ↗
                    </a>
                    <a
                      href={downloadUrl}
                      download
                      className="px-4 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-wider transition-all text-white"
                    >
                      Download PDF ↓
                    </a>
                  </div>
                </div>

                {/* Viewport Frame */}
                <div className="w-full flex-1 rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-charcoal/40 backdrop-blur-md relative min-h-[450px] flex items-center justify-center p-4">
                  {useCloudinaryBooklet ? (
                    /* Dynamic Premium Page Turning booklet */
                    <div className="relative w-full h-full flex flex-col items-center justify-center">
                      
                      {/* Swipe drag overlay & double-click listener */}
                      <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden">
                        <motion.div
                          key={`${brochurePage}-${isMobile}`}
                          custom={turnDirection}
                          variants={{
                            enter: (dir) => ({
                              x: dir === 'next' ? 100 : -100,
                              opacity: 0,
                              rotateY: dir === 'next' ? 45 : -45,
                            }),
                            center: {
                              x: 0,
                              opacity: 1,
                              rotateY: 0,
                              transition: {
                                x: { type: 'spring', stiffness: 300, damping: 30 },
                                opacity: { duration: 0.3 },
                                rotateY: { duration: 0.4 },
                              }
                            },
                            exit: (dir) => ({
                              x: dir === 'next' ? -100 : 100,
                              opacity: 0,
                              rotateY: dir === 'next' ? -45 : 45,
                              transition: {
                                x: { duration: 0.3 },
                                opacity: { duration: 0.2 },
                                rotateY: { duration: 0.3 },
                              }
                            })
                          }}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          style={{ perspective: 1200, transformStyle: 'preserve-3d' }}
                          className="w-full h-full flex items-center justify-center"
                        >
                          <motion.div
                            drag={photoScale > 1}
                            dragConstraints={{
                              left: -350 * (photoScale - 1),
                              right: 350 * (photoScale - 1),
                              top: -250 * (photoScale - 1),
                              bottom: 250 * (photoScale - 1)
                            }}
                            dragElastic={0.15}
                            style={{ scale: photoScale, x: dragX, y: dragY }}
                            onDoubleClick={handleDoubleTap}
                            className="relative flex items-center justify-center cursor-grab active:cursor-grabbing w-full h-full"
                          >
                            
                            {/* Render Cover Page (Page 1) or Mobile (Single Page) */}
                            {((!isMobile && brochurePage === 1) || isMobile) ? (
                              <div className="relative h-full aspect-[1/1.414] max-h-[70vh] rounded-lg overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border border-white/10 bg-white">
                                <Image
                                  src={getCloudinaryPageUrl(pdfSrc, brochurePage)}
                                  alt={`Brochure Page ${brochurePage}`}
                                  fill
                                  sizes="(max-width: 768px) 100vw, 450px"
                                  className="object-contain pointer-events-none selection:bg-transparent"
                                  unoptimized
                                  priority
                                  onError={() => handlePageError(brochurePage)}
                                />
                                {/* Soft paper shadow overlay */}
                                <div className="absolute inset-0 bg-gradient-to-r from-black/5 via-transparent to-black/10 pointer-events-none z-10" />
                                <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/10 pointer-events-none z-10" />
                              </div>
                            ) : (
                              /* Render Desktop spread (Two pages side-by-side) */
                              <div className="relative h-full aspect-[2/1.414] max-h-[70vh] rounded-2xl overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] border border-white/15 bg-[#1b1f27] flex">
                                
                                {/* Left page */}
                                <div className="w-1/2 h-full relative border-r border-black/20 bg-white">
                                  <Image
                                    src={getCloudinaryPageUrl(pdfSrc, brochurePage)}
                                    alt={`Brochure Page ${brochurePage}`}
                                    fill
                                    sizes="450px"
                                    className="object-contain pointer-events-none"
                                    unoptimized
                                    priority
                                    onError={() => handlePageError(brochurePage)}
                                  />
                                  {/* Shadow overlay representing the curved paper crease */}
                                  <div className="absolute inset-0 bg-gradient-to-r from-black/5 via-transparent to-black/25 pointer-events-none z-10" />
                                  <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/5 pointer-events-none z-10" />
                                </div>

                                {/* Right page */}
                                <div className="w-1/2 h-full relative bg-white">
                                  {brochurePage + 1 <= brochureMaxPages ? (
                                    <>
                                      <Image
                                        src={getCloudinaryPageUrl(pdfSrc, brochurePage + 1)}
                                        alt={`Brochure Page ${brochurePage + 1}`}
                                        fill
                                        sizes="450px"
                                        className="object-contain pointer-events-none"
                                        unoptimized
                                        priority
                                        onError={() => handlePageError(brochurePage + 1)}
                                      />
                                      {/* Shading for the curved paper fold */}
                                      <div className="absolute inset-0 bg-gradient-to-l from-black/5 via-transparent to-black/25 pointer-events-none z-10" />
                                      <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/5 pointer-events-none z-10" />
                                    </>
                                  ) : (
                                    /* If right page is out of bounds, render a premium dark back page */
                                    <div className="w-full h-full bg-[#1b1f27] flex flex-col items-center justify-center p-6 text-center text-white/20 select-none">
                                      <BookOpen className="w-12 h-12 mb-3 stroke-[1]" />
                                      <span className="text-[10px] font-black uppercase tracking-widest">End of Brochure</span>
                                    </div>
                                  )}
                                </div>

                                {/* Center Crease spine lines */}
                                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-8 bg-gradient-to-r from-black/15 via-black/45 to-transparent z-20 pointer-events-none" />
                                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1px] bg-white/10 z-30 pointer-events-none" />
                                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1px] bg-black/30 z-30 pointer-events-none ml-[1px]" />
                              </div>
                            )}

                          </motion.div>
                        </motion.div>

                        {/* Navigation Arrows floating */}
                        <button
                          onClick={handlePrevPage}
                          disabled={brochurePage === 1}
                          className="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white disabled:opacity-30 disabled:pointer-events-none transition-all z-20 shadow-lg"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                        
                        <button
                          onClick={handleNextPage}
                          disabled={
                            isMobile 
                              ? brochurePage >= brochureMaxPages 
                              : brochurePage + 1 >= brochureMaxPages
                          }
                          className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white disabled:opacity-30 disabled:pointer-events-none transition-all z-20 shadow-lg"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                      </div>

                      {/* Footer booklet toolbar: navigation, page count & zoom slider */}
                      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2 shrink-0">
                        {/* Page Indicator */}
                        <div className="text-white/50 text-[10px] font-black uppercase tracking-widest font-sans bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md">
                          {((!isMobile && brochurePage === 1) || isMobile) ? (
                            <span>Page {brochurePage} {brochureMaxPages < 50 ? `of ${brochureMaxPages}` : ''}</span>
                          ) : (
                            <span>
                              Pages {brochurePage} - {Math.min(brochurePage + 1, brochureMaxPages)} {brochureMaxPages < 50 ? `of ${brochureMaxPages}` : ''}
                            </span>
                          )}
                        </div>

                        {/* Direct page index jumping */}
                        <div className="flex bg-white/5 p-1 rounded-full border border-white/10">
                          <button
                            disabled={brochurePage === 1}
                            onClick={() => { setTurnDirection('prev'); setBrochurePage(1); }}
                            className="px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all text-white/60 hover:text-white disabled:opacity-30"
                          >
                            Cover
                          </button>
                          <button
                            disabled={brochurePage <= 2}
                            onClick={() => { setTurnDirection('prev'); setBrochurePage(2); }}
                            className="px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all text-white/60 hover:text-white disabled:opacity-30"
                          >
                            Index
                          </button>
                          <button
                            disabled={brochurePage + 1 >= brochureMaxPages}
                            onClick={() => { 
                              setTurnDirection('next'); 
                              const lastSet = isMobile 
                                ? brochureMaxPages 
                                : (brochureMaxPages % 2 === 0 ? brochureMaxPages : brochureMaxPages - 1);
                              setBrochurePage(Math.max(1, lastSet)); 
                            }}
                            className="px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all text-white/60 hover:text-white disabled:opacity-30"
                          >
                            End Page
                          </button>
                        </div>

                        {/* Integrated Booklet Zoom Toolbar */}
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-md">
                          <button 
                            onClick={handleZoomOut}
                            disabled={photoScale <= 1}
                            className="p-1 hover:bg-white/10 rounded-full transition-colors text-white disabled:opacity-30"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[10px] font-black text-white min-w-[36px] text-center tracking-wider font-sans">
                            {Math.round(photoScale * 100)}%
                          </span>
                          <button 
                            onClick={handleZoomIn}
                            disabled={photoScale >= 4}
                            className="p-1 hover:bg-white/10 rounded-full transition-colors text-white disabled:opacity-30"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          {photoScale > 1 && (
                            <button 
                              onClick={handleZoomReset}
                              className="text-[9px] font-black text-primary-400 hover:text-primary-300 uppercase tracking-widest pl-2.5 border-l border-white/10 font-sans"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Secure fallback Google Docs viewer frame for Google Drive / external links */
                    <iframe
                      src={embedSrc}
                      className="w-full h-full absolute inset-0 border-0 bg-slate-900"
                      title="Digital Brochure Viewer"
                      allowFullScreen
                    />
                  )}
                </div>
              </div>
            );
          })()}


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
            <div className="w-full h-full max-w-5xl flex flex-col space-y-4">
              <div className="flex items-center justify-between text-white shrink-0">
                <div className="flex items-center gap-2">
                  <MapIcon className="w-5 h-5 text-primary-400" />
                  <span className="text-xs font-black uppercase tracking-[0.2em] font-sans">Interactive Location verified by REGA</span>
                </div>
              </div>
              <div className="w-full flex-1 rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/40 backdrop-blur-md relative min-h-[450px]">
                {mapEmbedUrl ? (
                  <iframe
                    src={mapEmbedUrl.includes('src="') ? (mapEmbedUrl.match(/src="([^"]+)"/)?.[1] || mapEmbedUrl) : mapEmbedUrl}
                    className="w-full h-full border-0 absolute inset-0 bg-slate-900"
                    title="Interactive Google Map"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-[#1a1e26]/80 backdrop-blur-md">
                    <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-primary-500 mb-6 animate-pulse">
                      <MapIcon className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-white font-serif mb-2">{t('viewOnMap')}</h3>
                    <p className="text-white/40 max-w-sm text-xs uppercase tracking-widest font-black mb-6">Interactive Maps Integration</p>
                    <div className="w-full max-w-lg h-48 bg-white/5 rounded-2xl border border-dashed border-white/20 flex items-center justify-center relative grayscale opacity-40">
                      <Image src="/static-map-placeholder.jpg" alt="" fill className="object-cover" unoptimized />
                      <span className="relative z-10 text-[9px] text-white font-black uppercase tracking-[0.2em]">Coordinates Verified</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Persistent Agent Footer */}
        <div className="h-24 bg-white/5 backdrop-blur-xl border-t border-white/10 px-4 sm:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 min-w-0">
             <div className="relative w-11 h-11 rounded-full overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
                {agent?.avatarUrl ? (
                  <Image src={agent.avatarUrl} alt={agent.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary-600 text-white text-sm font-bold">
                    {(agent?.name || 'B').charAt(0)}
                  </div>
                )}
             </div>
             <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                   <span className="text-[9px] font-black text-primary-400 uppercase tracking-widest leading-none">
                     {agent?.role === 'FIRM' ? 'Licensed Firm' : 'Broker'}
                   </span>
                   <ShieldCheck className="w-3 h-3 text-primary-400 shrink-0" />
                </div>
                <p className="text-white font-bold text-sm truncate max-w-[150px]">{agent?.name || 'Authorized Broker'}</p>
                <p className="text-white/40 text-[9px] font-black uppercase tracking-widest leading-none mt-0.5">Verified Partner</p>
             </div>
          </div>

          <div className="flex items-center gap-3">
             <button 
                onClick={() => onContactAttempt?.('whatsapp')}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
             >
                <MessageSquare className="w-4 h-4" />
                WhatsApp
             </button>
             <button 
                onClick={() => onContactAttempt?.('phone')}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-bold text-xs hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20"
             >
                <Phone className="w-4 h-4" />
                {isQualified ? (agent?.phone || 'Call') : 'Call Agent'}
             </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

