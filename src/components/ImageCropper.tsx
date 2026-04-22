import React, { useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { Upload, X, Check } from 'lucide-react';

interface ImageCropperProps {
  currentImage?: string;
  onImageCropped: (croppedImageBase64: string) => void;
  aspectRatio?: number;
  circularCrop?: boolean;
}

export default function ImageCropper({ currentImage, onImageCropped, aspectRatio = 1, circularCrop = false }: ImageCropperProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadImageFile = async (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const imageDataUrl = await readFile(file);
    setImageSrc(imageDataUrl);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await loadImageFile(e.target.files?.[0]);
  };

  const onCropCompleteCallback = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      onImageCropped(croppedImage);
      setImageSrc(null); // Reset after saving
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancel = () => {
    setImageSrc(null);
  };

  if (!imageSrc) {
    return (
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault();
          void loadImageFile(e.dataTransfer.files?.[0]);
        }}
        className="flex w-full flex-col items-center justify-center p-8 border-2 border-dashed border-zinc-700 rounded-xl bg-zinc-900/50 hover:bg-zinc-900 transition-colors cursor-pointer relative overflow-hidden text-center"
      >
        {currentImage && (
          <img src={currentImage} alt="Current" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        )}
        <input 
          ref={inputRef}
          type="file" 
          accept="image/*" 
          onChange={onFileChange} 
          className="sr-only"
        />
        <div className="relative z-10 flex flex-col items-center pointer-events-none">
          <Upload className="w-10 h-10 text-zinc-400 mb-3" />
          <p className="text-sm font-medium text-zinc-200">{currentImage ? 'Click or drag to change image' : 'Click or drag image to upload'}</p>
          <p className="text-xs text-zinc-400 mt-1">PNG, JPG, WEBP up to 5MB</p>
        </div>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="font-bold text-lg">Crop Image</h3>
          <button onClick={handleCancel} className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="relative w-full h-[400px] bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            cropShape={circularCrop ? 'round' : 'rect'}
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={onCropCompleteCallback}
            onZoomChange={setZoom}
          />
        </div>
        
        <div className="p-4 border-t border-zinc-800 bg-zinc-900">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-xs font-medium text-zinc-400">Zoom</span>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={handleCancel} className="flex-1 py-2 rounded-lg font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} className="flex-1 py-2 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
              <Check className="w-4 h-4" /> Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions for image cropping
function readFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result as string), false);
    reader.readAsDataURL(file);
  });
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // needed to avoid cross-origin issues
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  flip = { horizontal: false, vertical: false }
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  // Set canvas size to match the bounding box
  canvas.width = image.width;
  canvas.height = image.height;

  ctx.translate(image.width / 2, image.height / 2);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const croppedCanvas = document.createElement('canvas');
  const croppedCtx = croppedCanvas.getContext('2d');

  if (!croppedCtx) {
    throw new Error('No 2d context');
  }

  // Set the size of the cropped canvas
  croppedCanvas.width = pixelCrop.width;
  croppedCanvas.height = pixelCrop.height;

  // Draw the cropped image onto the new canvas
  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // Compress heavily to stay well under 1MB limit for Firestore
  return croppedCanvas.toDataURL('image/jpeg', 0.7);
}
