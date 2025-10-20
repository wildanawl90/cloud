import { useState, useEffect } from 'react';
import {
  FileIcon,
  Download,
  Trash2,
  Image,
  FileText,
  Film,
  Music,
  Archive,
  Loader2,
  Calendar,
  HardDrive,
} from 'lucide-react';
import { supabase, FileRecord } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface FileListProps {
  refreshTrigger: number;
}

export default function FileList({ refreshTrigger }: FileListProps) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchFiles();
  }, [refreshTrigger]);

  const fetchFiles = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (err) {
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file: FileRecord) => {
    try {
      const { data, error } = await supabase.storage
        .from('files')
        .download(file.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await supabase
        .from('files')
        .update({ last_accessed: new Date().toISOString() })
        .eq('id', file.id);
    } catch (err: any) {
      console.error('Download error:', err);
      alert(`Failed to download: ${err.message}`);
    }
  };

  const handleDelete = async (file: FileRecord) => {
    if (!confirm(`Delete ${file.filename}?`)) return;

    setDeletingId(file.id);
    try {
      const { error: storageError } = await supabase.storage
        .from('files')
        .remove([file.storage_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      if (user) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ storage_used: Math.max(0, user.storage_used - file.file_size) })
          .eq('id', user.id);

        if (updateError) throw updateError;
      }

      setFiles(files.filter(f => f.id !== file.id));
    } catch (err: any) {
      console.error('Delete error:', err);
      alert(`Failed to delete: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (mimeType.startsWith('video/')) return <Film className="w-5 h-5" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-5 h-5" />;
    if (mimeType.startsWith('text/') || mimeType.includes('pdf')) return <FileText className="w-5 h-5" />;
    if (mimeType.includes('zip') || mimeType.includes('rar')) return <Archive className="w-5 h-5" />;
    return <FileIcon className="w-5 h-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <HardDrive className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-700 mb-2">No files yet</h3>
        <p className="text-slate-500">Upload your first file to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 flex items-center gap-4"
        >
          <div className="text-blue-500">{getFileIcon(file.mime_type)}</div>

          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-slate-900 truncate">{file.filename}</h3>
            <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
              <span className="flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5" />
                {formatFileSize(file.file_size)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(file.uploaded_at)}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleDownload(file)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleDelete(file)}
              disabled={deletingId === file.id}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="Delete"
            >
              {deletingId === file.id ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
