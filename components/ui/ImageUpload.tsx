'use client';

import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  value?: string;
  onChange: (url: string) => void;
  uploadType?: 'question' | 'news' | 'category' | 'profile' | 'test';
  label?: string;
  className?: string;
}

export function ImageUpload({ value, onChange, uploadType = 'question', label = 'Upload Image', className = '' }: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPEG, PNG, or WebP images are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', uploadType);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      onChange(json.data.url);
      toast.success('Image uploaded');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={className}>
      {label && <label className="block text-xs font-semibold text-surface-700 mb-1">{label}</label>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
      />

      {value ? (
        <div className="relative inline-block">
          <img
            src={value}
            alt="Uploaded"
            className="max-h-32 max-w-xs rounded-lg border border-surface-200 object-contain"
          />
          <button
            onClick={() => onChange('')}
            className="absolute -top-2 -right-2 w-6 h-6 bg-danger-500 text-white rounded-full flex items-center justify-center hover:bg-danger-600 transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 border border-dashed border-surface-300 hover:border-brand-300 hover:bg-brand-50 rounded-xl px-4 py-3 text-sm text-surface-500 hover:text-brand-600 transition-all disabled:opacity-50"
        >
          {uploading
            ? <><Loader2 size={15} className="animate-spin" /> Uploading...</>
            : <><Upload size={15} /> {label}</>
          }
        </button>
      )}
    </div>
  );
}
