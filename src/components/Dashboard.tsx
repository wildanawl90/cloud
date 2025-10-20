import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Cloud, LogOut, HardDrive, Upload as UploadIcon } from 'lucide-react';
import FileUpload from './FileUpload';
import FileList from './FileList';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      window.location.reload();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1);
    window.location.reload();
  };

  const formatStorageSize = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return gb.toFixed(2);
  };

  const storagePercentage = user ? (user.storage_used / user.storage_limit) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Cloud className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">WillCloud</h1>
                <p className="text-xs text-slate-500">Simple Cloud Storage</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-900">{user?.full_name || user?.email}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <HardDrive className="w-6 h-6 text-blue-600" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Storage Usage</h2>
                  <p className="text-sm text-slate-500">
                    {formatStorageSize(user?.storage_used || 0)} GB of{' '}
                    {formatStorageSize(user?.storage_limit || 0)} GB used
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUpload(!showUpload)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
              >
                <UploadIcon className="w-4 h-4" />
                <span>Upload Files</span>
              </button>
            </div>

            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  storagePercentage > 90
                    ? 'bg-red-500'
                    : storagePercentage > 70
                    ? 'bg-yellow-500'
                    : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(storagePercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {showUpload && (
          <div className="mb-8">
            <FileUpload onUploadComplete={handleUploadComplete} />
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">My Files</h2>
          <FileList refreshTrigger={refreshTrigger} />
        </div>
      </main>
    </div>
  );
}
