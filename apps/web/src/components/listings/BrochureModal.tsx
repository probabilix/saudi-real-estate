'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ChevronLeft, ChevronRight, BookOpen, Plus, Minus
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface BrochureModalProps {
  isOpen: boolean;
  onClose: () => void;
  brochureUrl: string;
}

export default function BrochureModal({ 
  isOpen, 
  onClose, 
  brochureUrl 
}: BrochureModalProps) {
  const t = useTranslations('listing');
  const [brochurePage, setBrochurePage] = useState(1);
  const [brochureMaxPages, setBrochureMaxPages] = useState(50);
  const [cloudinaryError, setCloudinaryError] = useState(false);
  const [turnDirection, setTurnDirection] = useState<'next' | 'prev'>('next');
  const [photoScale, setPhotoScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reset zoom and brochure states on open/close
  useEffect(() => {
    if (isOpen) {
      setBrochurePage(1);
      setBrochureMaxPages(50);
      setCloudinaryError(false);
      setPhotoScale(1);
    }
  }, [isOpen]);

  // Handle Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowRight') handleNextPage();
      if (e.key === 'ArrowLeft') handlePrevPage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, brochurePage, brochureMaxPages, isMobile, onClose]);

  if (!isOpen || !brochureUrl) return null;

  const isCloudinary = brochureUrl.includes('res.cloudinary.com');
  const useCloudinaryBooklet = isCloudinary && !cloudinaryError;

  const getBrochureEmbedUrl = (url: string) => {
    if (url.includes('drive.google.com')) {
      const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }
    return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
  };

  const embedSrc = getBrochureEmbedUrl(brochureUrl);

  const getDownloadUrl = (url: string) => {
    if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
      return url.replace('/upload/', '/upload/fl_attachment/');
    }
    return url;
  };
  const downloadUrl = getDownloadUrl(brochureUrl);

  const getCloudinaryPageUrl = (url: string, pageNumber: number) => {
    if (!url.includes('res.cloudinary.com')) return url;
    let cleanUrl = url.split('?')[0];
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

  const handleZoomIn = () => setPhotoScale((prev) => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => setPhotoScale((prev) => Math.max(prev - 0.5, 1));
  const handleZoomReset = () => setPhotoScale(1);



  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-charcoal flex flex-col w-screen h-screen overflow-hidden"
      >
        {/* Header Controls */}
        <div className="h-20 px-6 sm:px-8 flex items-center justify-between border-b border-white/10 shrink-0 select-none">
          <div className="flex items-center gap-6">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
              title="Close Viewer"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="h-6 w-px bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-2 text-white">
              <BookOpen className="w-5 h-5 text-primary-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] font-sans">
                {useCloudinaryBooklet ? 'Interactive Digital Brochure' : 'Digital Brochure'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <a
              href={brochureUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-wider transition-all text-white active:scale-95 inline-flex items-center justify-center"
            >
              Open Direct ↗
            </a>
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-wider transition-all text-white active:scale-95 inline-flex items-center justify-center"
            >
              Download PDF ↓
            </a>
          </div>
        </div>

        {/* Content Viewport Frame */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4 md:p-8 bg-charcoal/40">
          <div className="w-full h-full max-w-[95vw] lg:max-w-[90vw] xl:max-w-[85vw] flex flex-col justify-center">
            
            <div className="w-full flex-1 rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-black/20 backdrop-blur-md relative min-h-[450px] flex items-center justify-center p-4">
              {useCloudinaryBooklet ? (
                /* Dynamic Premium 3D open-spread booklet */
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  
                  {/* Swipe & Double-Click animations container */}
                  <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden">
                    <motion.div
                      key={`${brochurePage}-${isMobile}`}
                      custom={turnDirection}
                      variants={{
                        enter: (dir) => ({
                          x: dir === 'next' ? 120 : -120,
                          opacity: 0,
                          rotateY: dir === 'next' ? 45 : -45,
                        }),
                        center: {
                          x: 0,
                          opacity: 1,
                          rotateY: 0,
                          transition: {
                            x: { type: 'spring', stiffness: 280, damping: 28 },
                            opacity: { duration: 0.3 },
                            rotateY: { duration: 0.4 },
                          }
                        },
                        exit: (dir) => ({
                          x: dir === 'next' ? -120 : 120,
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
                        style={{ scale: photoScale }}
                        className="relative flex items-center justify-center w-full h-full"
                      >
                        
                        {/* Cover page or Mobile single page */}
                        {((!isMobile && brochurePage === 1) || isMobile) ? (
                          <div className="relative h-full aspect-[1/1.414] max-h-[90vh] rounded-2xl overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] border border-white/10 bg-white">
                            <Image
                              src={getCloudinaryPageUrl(brochureUrl, brochurePage)}
                              alt={`Brochure Page ${brochurePage}`}
                              fill
                              sizes="(max-width: 768px) 100vw, 650px"
                              className="object-contain pointer-events-none select-none"
                              unoptimized
                              priority
                              onError={() => handlePageError(brochurePage)}
                            />
                            {/* Curved shading folds */}
                            <div className="absolute inset-0 bg-gradient-to-r from-black/5 via-transparent to-black/10 pointer-events-none z-10" />
                          </div>
                        ) : (
                          /* Desktop Open spread view */
                          <div className="relative h-full aspect-[2/1.414] max-h-[90vh] rounded-3xl overflow-hidden shadow-[0_35px_70px_-20px_rgba(0,0,0,0.7)] border border-white/15 bg-[#1b1f27] flex">
                            
                            {/* Left Page */}
                            <div className="w-1/2 h-full relative border-r border-black/25 bg-white">
                              <Image
                                src={getCloudinaryPageUrl(brochureUrl, brochurePage)}
                                alt={`Brochure Page ${brochurePage}`}
                                fill
                                sizes="600px"
                                className="object-contain pointer-events-none select-none"
                                unoptimized
                                priority
                                onError={() => handlePageError(brochurePage)}
                              />
                              <div className="absolute inset-0 bg-gradient-to-r from-black/5 via-transparent to-black/25 pointer-events-none z-10" />
                            </div>

                            {/* Right Page */}
                            <div className="w-1/2 h-full relative bg-white">
                              {brochurePage + 1 <= brochureMaxPages ? (
                                <>
                                  <Image
                                    src={getCloudinaryPageUrl(brochureUrl, brochurePage + 1)}
                                    alt={`Brochure Page ${brochurePage + 1}`}
                                    fill
                                    sizes="600px"
                                    className="object-contain pointer-events-none select-none"
                                    unoptimized
                                    priority
                                    onError={() => handlePageError(brochurePage + 1)}
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-l from-black/5 via-transparent to-black/25 pointer-events-none z-10" />
                                </>
                              ) : (
                                <div className="w-full h-full bg-[#1b1f27] flex flex-col items-center justify-center p-6 text-center text-white/20 select-none">
                                  <BookOpen className="w-12 h-12 mb-3 stroke-[1]" />
                                  <span className="text-[10px] font-black uppercase tracking-widest">End of Brochure</span>
                                </div>
                              )}
                            </div>

                            {/* Deep Spine Crease shadow lines */}
                            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-8 bg-gradient-to-r from-black/15 via-black/45 to-transparent z-20 pointer-events-none" />
                            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1px] bg-white/10 z-30 pointer-events-none" />
                            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1px] bg-black/30 z-30 pointer-events-none ml-[1px]" />
                          </div>
                        )}

                      </motion.div>
                    </motion.div>

                    {/* Left arrow trigger */}
                    <button
                      onClick={handlePrevPage}
                      disabled={brochurePage === 1}
                      className="absolute left-4 p-4 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white disabled:opacity-30 disabled:pointer-events-none transition-all z-20 shadow-lg"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    
                    {/* Right arrow trigger */}
                    <button
                      onClick={handleNextPage}
                      disabled={
                        isMobile 
                          ? brochurePage >= brochureMaxPages 
                          : brochurePage + 1 >= brochureMaxPages
                      }
                      className="absolute right-4 p-4 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white disabled:opacity-30 disabled:pointer-events-none transition-all z-20 shadow-lg"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Bottom spread control toolbar */}
                  <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2 shrink-0 select-none">
                    {/* Active page counter */}
                    <div className="text-white/50 text-[10px] font-black uppercase tracking-widest font-sans bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md">
                      {((!isMobile && brochurePage === 1) || isMobile) ? (
                        <span>Page {brochurePage} {brochureMaxPages < 50 ? `of ${brochureMaxPages}` : ''}</span>
                      ) : (
                        <span>
                          Pages {brochurePage} - {Math.min(brochurePage + 1, brochureMaxPages)} {brochureMaxPages < 50 ? `of ${brochureMaxPages}` : ''}
                        </span>
                      )}
                    </div>

                    {/* Section links */}
                    <div className="flex bg-white/5 p-1 rounded-full border border-white/10">
                      <button
                        disabled={brochurePage === 1}
                        onClick={() => { setTurnDirection('prev'); setBrochurePage(1); }}
                        className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all text-white/60 hover:text-white disabled:opacity-30"
                      >
                        Cover
                      </button>
                      <button
                        disabled={brochurePage <= 2}
                        onClick={() => { setTurnDirection('prev'); setBrochurePage(2); }}
                        className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all text-white/60 hover:text-white disabled:opacity-30"
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
                        className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all text-white/60 hover:text-white disabled:opacity-30"
                      >
                        End Page
                      </button>
                    </div>

                    {/* Scaled zoom slider */}
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
                /* Fallback docs frame if non-Cloudinary URL */
                <iframe
                  src={embedSrc}
                  className="w-full h-full absolute inset-0 border-0 bg-slate-900"
                  title="Digital Brochure"
                  allowFullScreen
                />
              )}
            </div>

          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
