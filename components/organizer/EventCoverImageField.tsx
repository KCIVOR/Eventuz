"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Cropper from "react-easy-crop";
import { getCroppedImg, type PixelCrop } from "@/lib/organizer/imageUtils";

type Props = {
  currentImageUrl?: string | null;
  eventName?: string;
  inputId?: string;
  label?: string;
};

export function EventCoverImageField({
  currentImageUrl,
  eventName = "Event",
  inputId = "cover_image",
  label = "Event cover",
}: Props) {
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cropper state
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  const previewUrl = selectedPreviewUrl || currentImageUrl || "";
  const previewLabel = selectedPreviewUrl ? "Selected image preview" : "Current cover image";
  const hasPreview = previewUrl.length > 0;

  useEffect(() => {
    return () => {
      if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
      if (imageToCrop) URL.revokeObjectURL(imageToCrop);
    };
  }, [selectedPreviewUrl, imageToCrop]);

  const onCropComplete = (croppedArea: any, croppedAreaPixels: PixelCrop) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    setSelectedFileName(file.name);
    const url = URL.createObjectURL(file);
    setImageToCrop(url);
    setShowCropper(true);
  };

  const handleCropSave = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;

    try {
      setIsCropping(true);
      const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      if (!croppedBlob) throw new Error("Could not crop image");

      // Create a new File from the Blob to put back into the input
      const croppedFile = new File([croppedBlob], selectedFileName, {
        type: "image/jpeg",
      });

      // Use DataTransfer to set the files on the input element
      if (fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(croppedFile);
        fileInputRef.current.files = dataTransfer.files;
      }

      // Update preview
      const previewUrl = URL.createObjectURL(croppedBlob);
      setSelectedPreviewUrl((previousUrl) => {
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        return previewUrl;
      });

      setShowCropper(false);
    } catch (e) {
      console.error("[eventuz:cropper]", e);
      alert("Failed to crop image. Please try another one.");
    } finally {
      setIsCropping(false);
    }
  };

  const helperText = useMemo(
    () =>
      selectedPreviewUrl
        ? "Preview of your cropped image. Save the event configuration to publish this cover."
        : "Upload an image to crop and zoom. Recommended: 16:9 landscape, min 1200x675px.",
    [selectedPreviewUrl]
  );

  return (
    <div className="space-y-5">
      {hasPreview ? (
        <div className="overflow-hidden rounded-sm border border-border bg-muted/20">
          <div
            className="aspect-video bg-cover bg-center"
            style={{ backgroundImage: `url(${previewUrl})` }}
            aria-label={`${eventName} ${previewLabel.toLowerCase()}`}
          />
          <div className="border-t border-border bg-card px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-gold">
              {previewLabel}
            </p>
            {selectedFileName ? (
              <p className="mt-1 break-all text-xs text-muted-foreground">{selectedFileName}</p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-sm border border-dashed border-border bg-muted/20 px-5 py-8 text-center">
          <p className="text-sm font-light text-muted-foreground">
            No cover image yet. The public landing page will use the default Eventuz hero
            background until you add one.
          </p>
        </div>
      )}

      <div className="rounded-sm border border-border bg-muted/20 p-5">
        <label
          htmlFor={inputId}
          className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {label}
        </label>
        <input
          id={inputId}
          ref={fileInputRef}
          name="cover_image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="mt-3 block w-full text-sm text-muted-foreground file:mr-4 file:rounded-sm file:border-0 file:bg-primary file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-widest file:text-primary-foreground hover:file:bg-accent-gold hover:file:text-foreground"
          onChange={handleFileChange}
        />
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{helperText}</p>
      </div>

      {/* CROPPER MODAL */}
      {showCropper && imageToCrop && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-hidden">
          <div className="relative w-full max-w-4xl bg-surface-app border border-border shadow-2xl rounded-2xl flex flex-col h-[85vh]">
            <div className="flex justify-between items-center p-5 border-b border-border/50">
              <h2 className="font-serif text-xl text-foreground">Crop Your Cover Image</h2>
              <button
                onClick={() => setShowCropper(false)}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
              </button>
            </div>

            <div className="relative flex-1 bg-black/20">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={16 / 9}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            <div className="p-6 space-y-6 bg-surface-app border-t border-border/50">
              <div className="space-y-3">
                <div className="flex justify-between text-xs uppercase tracking-widest font-semibold text-muted-foreground">
                  <span>Zoom</span>
                  <span>{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-accent-gold"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCropper(false)}
                  className="btn-eventuz-secondary px-6 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCropSave}
                  disabled={isCropping}
                  className="btn-eventuz-gold px-8 py-2 text-xs shadow-lg shadow-accent-gold/10 flex items-center gap-2"
                >
                  {isCropping ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Processing...
                    </>
                  ) : (
                    "Apply Crop"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
