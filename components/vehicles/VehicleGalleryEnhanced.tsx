'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  Maximize2, 
  X, 
  ZoomIn, 
  ZoomOut,
  Download,
  Share2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

interface VehicleImage {
  id: string;
  url: string;
  order: number;
  type: string;
  isPrimary: boolean;
}

interface VehicleGalleryProps {
  images: VehicleImage[];
  vehicleTitle: string;
}

export default function VehicleGalleryEnhanced({ images, vehicleTitle }: VehicleGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  // Sort images by isPrimary first, then by order
  const sortedImages = [...images].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return a.order - b.order;
  });

  const currentImage = sortedImages[selectedImageIndex];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFullscreenOpen) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          handleFullscreenPrevious();
          break;
        case 'ArrowRight':
          handleFullscreenNext();
          break;
        case 'Escape':
          setIsFullscreenOpen(false);
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreenOpen, fullscreenIndex]);

  // Touch handlers for swipe gestures
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNextImage();
    } else if (isRightSwipe) {
      handlePreviousImage();
    }
  };

  const handlePreviousImage = () => {
    setSelectedImageIndex((prev) => 
      prev === 0 ? sortedImages.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setSelectedImageIndex((prev) => 
      prev === sortedImages.length - 1 ? 0 : prev + 1
    );
  };

  const handleFullscreenPrevious = () => {
    setFullscreenIndex((prev) => 
      prev === 0 ? sortedImages.length - 1 : prev - 1
    );
    setZoom(1);
  };

  const handleFullscreenNext = () => {
    setFullscreenIndex((prev) => 
      prev === sortedImages.length - 1 ? 0 : prev + 1
    );
    setZoom(1);
  };

  const openFullscreen = (index: number) => {
    setFullscreenIndex(index);
    setIsFullscreenOpen(true);
    setZoom(1);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.5, 1));
  };

  const handleDownload = async () => {
    try {
      const imageUrl = sortedImages[fullscreenIndex].url;
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${vehicleTitle.replace(/\s+/g, '-')}-${fullscreenIndex + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Imagen descargada",
        description: "La imagen se ha descargado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error al descargar",
        description: "No se pudo descargar la imagen",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    const imageUrl = sortedImages[fullscreenIndex].url;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: vehicleTitle,
          text: `Imagen de ${vehicleTitle}`,
          url: imageUrl,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      await navigator.clipboard.writeText(imageUrl);
      toast({
        title: "Enlace copiado",
        description: "El enlace de la imagen se copió al portapapeles",
      });
    }
  };

  if (sortedImages.length === 0) {
    return (
      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="aspect-[4/3] bg-muted flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <div className="text-4xl mb-2">📷</div>
            <p>No hay imágenes disponibles</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card border rounded-lg overflow-hidden">
        {/* Main Image Display with Touch Support */}
        <div 
          ref={galleryRef}
          className="relative aspect-[4/3] group cursor-grab active:cursor-grabbing"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {imageErrors.has(currentImage.id) ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Error al cargar imagen</p>
              </div>
            </div>
          ) : (
            <Image
              src={currentImage.url}
              alt={`${vehicleTitle} - Imagen ${selectedImageIndex + 1}`}
              fill
              className="object-cover select-none"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 800px"
              priority={selectedImageIndex === 0}
              draggable={false}
              onError={() => handleImageError(currentImage.id)}
            />
          )}
          
          {/* Navigation Arrows - Desktop */}
          {sortedImages.length > 1 && (
            <>
              <Button
                variant="secondary"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
                onClick={handlePreviousImage}
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
                onClick={handleNextImage}
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Touch Navigation Indicators - Mobile */}
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1 md:hidden">
            {sortedImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setSelectedImageIndex(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  selectedImageIndex === index 
                    ? "bg-white w-6" 
                    : "bg-white/50"
                )}
                aria-label={`Ir a imagen ${index + 1}`}
              />
            ))}
          </div>

          {/* Fullscreen Button */}
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-2 right-2 opacity-70 md:opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => openFullscreen(selectedImageIndex)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>

          {/* Image Counter */}
          <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
            {selectedImageIndex + 1} / {sortedImages.length}
          </div>
        </div>

        {/* Thumbnail Grid - Scrollable on mobile */}
        {sortedImages.length > 1 && (
          <div className="p-4">
            <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
              {sortedImages.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImageIndex(index)}
                  className={cn(
                    "relative flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition-all",
                    selectedImageIndex === index 
                      ? "border-primary ring-2 ring-primary/30" 
                      : "border-transparent hover:border-muted-foreground"
                  )}
                >
                  <Image
                    src={image.url}
                    alt={`${vehicleTitle} - Miniatura ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                  {image.isPrimary && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full shadow-sm" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Fullscreen Modal */}
      <Dialog open={isFullscreenOpen} onOpenChange={setIsFullscreenOpen}>
        <DialogContent className="max-w-screen max-h-screen w-screen h-screen p-0 m-0 bg-black">
          <div 
            className="relative w-full h-full flex items-center justify-center overflow-hidden"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={(e) => {
              if (!touchStart || !touchEnd) return;
              
              const distance = touchStart - touchEnd;
              const isLeftSwipe = distance > minSwipeDistance;
              const isRightSwipe = distance < -minSwipeDistance;

              if (zoom === 1) {
                if (isLeftSwipe) {
                  handleFullscreenNext();
                } else if (isRightSwipe) {
                  handleFullscreenPrevious();
                }
              }
            }}
          >
            <div 
              className="relative w-full h-full flex items-center justify-center"
              style={{ transform: `scale(${zoom})` }}
            >
              {imageErrors.has(sortedImages[fullscreenIndex]?.id) ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <AlertTriangle className="h-16 w-16 mx-auto mb-4" />
                    <p className="text-lg">Error al cargar imagen</p>
                    <p className="text-sm opacity-70">Esta imagen no está disponible</p>
                  </div>
                </div>
              ) : (
                <Image
                  src={sortedImages[fullscreenIndex]?.url}
                  alt={`${vehicleTitle} - Imagen ${fullscreenIndex + 1}`}
                  fill
                  className="object-contain select-none"
                  sizes="100vw"
                  quality={90}
                  draggable={false}
                  onError={() => handleImageError(sortedImages[fullscreenIndex]?.id)}
                />
              )}
            </div>
            
            {/* Control Bar */}
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4 z-20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={handleZoomOut}
                    disabled={zoom <= 1}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-white text-sm px-2">{Math.round(zoom * 100)}%</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={handleZoomIn}
                    disabled={zoom >= 3}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={handleDownload}
                    disabled={isDownloading || imageErrors.has(sortedImages[fullscreenIndex]?.id)}
                    title={isDownloading ? "Descargando..." : "Descargar imagen"}
                  >
                    <Download className={cn("h-4 w-4", isDownloading && "animate-pulse")} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={handleShare}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={() => setIsFullscreenOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Navigation Arrows */}
            {sortedImages.length > 1 && zoom === 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={handleFullscreenPrevious}
                >
                  <ChevronLeftIcon className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={handleFullscreenNext}
                >
                  <ChevronRightIcon className="h-6 w-6" />
                </Button>
              </>
            )}

            {/* Image Counter and Thumbnails */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 z-20">
              <div className="text-center text-white mb-3">
                {fullscreenIndex + 1} / {sortedImages.length}
              </div>
              
              {/* Thumbnail Strip */}
              <div className="flex gap-2 justify-center overflow-x-auto max-w-full">
                {sortedImages.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => {
                      setFullscreenIndex(index);
                      setZoom(1);
                    }}
                    className={cn(
                      "relative flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded overflow-hidden border-2 transition-all",
                      fullscreenIndex === index 
                        ? "border-white ring-2 ring-white/50" 
                        : "border-white/30 hover:border-white/60"
                    )}
                  >
                    <Image
                      src={image.url}
                      alt={`Miniatura ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}