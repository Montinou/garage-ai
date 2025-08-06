'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeftIcon, ChevronRightIcon, MaximizeIcon, XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export default function VehicleGallery({ images, vehicleTitle }: VehicleGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);

  // Sort images by isPrimary first, then by order
  const sortedImages = [...images].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return a.order - b.order;
  });

  const currentImage = sortedImages[selectedImageIndex];

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
  };

  const handleFullscreenNext = () => {
    setFullscreenIndex((prev) => 
      prev === sortedImages.length - 1 ? 0 : prev + 1
    );
  };

  const openFullscreen = (index: number) => {
    setFullscreenIndex(index);
    setIsFullscreenOpen(true);
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
        {/* Main Image Display */}
        <div className="relative aspect-[4/3] group">
          <Image
            src={currentImage.url}
            alt={`${vehicleTitle} - Imagen ${selectedImageIndex + 1}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 800px"
            priority={selectedImageIndex === 0}
          />
          
          {/* Navigation Arrows */}
          {sortedImages.length > 1 && (
            <>
              <Button
                variant="secondary"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handlePreviousImage}
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleNextImage}
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Fullscreen Button */}
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => openFullscreen(selectedImageIndex)}
          >
            <MaximizeIcon className="h-4 w-4" />
          </Button>

          {/* Image Counter */}
          <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
            {selectedImageIndex + 1} / {sortedImages.length}
          </div>
        </div>

        {/* Thumbnail Grid */}
        {sortedImages.length > 1 && (
          <div className="p-4">
            <div className="flex gap-2 overflow-x-auto">
              {sortedImages.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImageIndex(index)}
                  className={cn(
                    "relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors",
                    selectedImageIndex === index 
                      ? "border-primary" 
                      : "border-transparent hover:border-muted-foreground"
                  )}
                >
                  <Image
                    src={image.url}
                    alt={`${vehicleTitle} - Miniatura ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                  {image.isPrimary && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      <Dialog open={isFullscreenOpen} onOpenChange={setIsFullscreenOpen}>
        <DialogContent className="max-w-screen max-h-screen w-screen h-screen p-0 m-0">
          <div className="relative w-full h-full bg-black flex items-center justify-center">
            <Image
              src={sortedImages[fullscreenIndex]?.url}
              alt={`${vehicleTitle} - Imagen ${fullscreenIndex + 1} en pantalla completa`}
              fill
              className="object-contain"
              sizes="100vw"
              quality={90}
            />
            
            {/* Close Button */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-4 right-4 z-10"
              onClick={() => setIsFullscreenOpen(false)}
            >
              <XIcon className="h-4 w-4" />
            </Button>

            {/* Navigation Arrows */}
            {sortedImages.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
                  onClick={handleFullscreenPrevious}
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10"
                  onClick={handleFullscreenNext}
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Image Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-2 rounded text-sm z-10">
              {fullscreenIndex + 1} / {sortedImages.length}
            </div>

            {/* Thumbnail Strip */}
            <div className="absolute bottom-4 left-4 right-4 z-10">
              <div className="flex gap-2 justify-center overflow-x-auto max-w-full">
                {sortedImages.slice(0, 8).map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setFullscreenIndex(index)}
                    className={cn(
                      "relative flex-shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-colors",
                      fullscreenIndex === index 
                        ? "border-white" 
                        : "border-transparent hover:border-gray-400"
                    )}
                  >
                    <Image
                      src={image.url}
                      alt={`${vehicleTitle} - Miniatura ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </button>
                ))}
                {sortedImages.length > 8 && (
                  <div className="flex-shrink-0 w-12 h-12 rounded border-2 border-gray-400 bg-black/50 text-white text-xs flex items-center justify-center">
                    +{sortedImages.length - 8}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}