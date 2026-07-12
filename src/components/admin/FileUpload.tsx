import { useCallback, useState } from "react";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface FileUploadProps {
  label?: string;
  accept?: string;
  maxSizeMB?: number;
  currentImage?: string | null;
  onFileSelect: (file: File) => void;
  onRemove?: () => void;
  loading?: boolean;
  className?: string;
  multiple?: boolean;
  maxFiles?: number;
  currentImages?: string[];
  onFilesSelect?: (files: File[]) => void;
}

export const FileUpload = ({
  label,
  accept = "image/*",
  maxSizeMB = 5,
  currentImage,
  onFileSelect,
  onRemove,
  loading = false,
  className,
  multiple = false,
  maxFiles = 1,
  currentImages = [],
  onFilesSelect,
}: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>("");

  const validateFile = (file: File): boolean => {
    setError("");
    
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return false;
    }

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      setError(`File size must be less than ${maxSizeMB}MB`);
      return false;
    }

    return true;
  };

  const handleFiles = useCallback((files: FileList) => {
    const fileArray = Array.from(files);
    
    if (multiple && onFilesSelect) {
      const validFiles = fileArray.filter(validateFile);
      if (validFiles.length > 0) {
        onFilesSelect(validFiles);
      }
    } else if (fileArray.length > 0) {
      const file = fileArray[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  }, [multiple, onFilesSelect, onFileSelect, maxSizeMB]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  return (
    <div className={cn("space-y-3 w-full", className)}>
      {label && <Label className="block text-sm font-medium text-slate-700">{label}</Label>}
      
      {/* Current Image(s) Preview */}
      {!multiple && currentImage && (
        <div className="relative block w-full max-w-sm">
          <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
            <img
              src={currentImage}
              alt="Preview"
              className="w-full h-auto max-h-[300px] object-cover"
            />
          </div>
          {onRemove && !loading && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-3 -right-3 rounded-full shadow-md z-10"
              onClick={onRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {multiple && currentImages.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-4">
          {currentImages.map((img, idx) => (
            <div key={idx} className="relative">
              <img
                src={img}
                alt={`Preview ${idx + 1}`}
                className="w-full h-32 object-cover rounded-lg border"
              />
            </div>
          ))}
        </div>
      )}

      {/* Upload Area */}
      {((!multiple && !currentImage) || (multiple && currentImages.length < maxFiles)) && (
        <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
          isDragging && "border-primary bg-primary/5",
          !isDragging && "border-muted-foreground/25 hover:border-primary/50",
          loading && "opacity-50 cursor-not-allowed"
        )}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
          id={`file-upload-${label}`}
          disabled={loading}
          multiple={multiple}
        />
        <label
          htmlFor={`file-upload-${label}`}
          className="cursor-pointer flex flex-col items-center justify-center space-y-2"
        >
          {loading ? (
            <Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />
          ) : (
            <>
              <div className="p-4 bg-muted rounded-full">
                {currentImage || currentImages.length > 0 ? (
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {isDragging ? "Drop file here" : "Click to upload or drag and drop"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {multiple ? `Up to ${maxFiles} images` : "Single image"}, max {maxSizeMB}MB each
                </p>
              </div>
            </>
          )}
        </label>
      </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
};
