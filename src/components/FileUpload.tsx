import { useState, useRef } from 'react';
import { Upload, X, FileIcon, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface FileUploadProps {
  onUploadComplete: () => void;
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = async (files: File[]) => {
    if (!user) return;

    setError('');

    for (const file of files) {
      const totalSize = user.storage_used + file.size;
      if (totalSize > user.storage_limit) {
        setError('Storage limit exceeded. Please delete some files first.');
        continue;
      }

      setUploadingFiles(prev => [...prev, file.name]);

      try {
        const filePath = `${user.id}/${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase
          .from('files')
          .insert([
            {
              user_id: user.id,
              filename: file.name,
              file_size: file.size,
              mime_type: file.type || 'application/octet-stream',
              storage_path: filePath,
            },
          ]);

        if (dbError) throw dbError;

        const { error: updateError } = await supabase
          .from('users')
          .update({ storage_used: user.storage_used + file.size })
          .eq('id', user.id);

        if (updateError) throw updateError;

        onUploadComplete();
      } catch (err: any) {
        console.error('Upload error:', err);
        setError(`Failed to upload ${file.name}: ${err.message}`);
      } finally {
        setUploadingFiles(prev => prev.filter(name => name !== file.name));
      }
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50 scale-105'
            : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
        }`}
      >
        <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-slate-400'}`} />
        <p className="text-lg font-medium text-slate-700 mb-2">
          {isDragging ? 'Drop files here' : 'Click to upload or drag and drop'}
        </p>
        <p className="text-sm text-slate-500">
          Any file type supported
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {uploadingFiles.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4 space-y-2">
          <h3 className="font-medium text-slate-700 mb-3">Uploading...</h3>
          {uploadingFiles.map((filename) => (
            <div key={filename} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              <FileIcon className="w-5 h-5 text-slate-400" />
              <span className="text-sm text-slate-700 flex-1 truncate">{filename}</span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
