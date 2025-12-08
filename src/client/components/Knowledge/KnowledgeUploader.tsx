import { useState } from 'react';
import api from '../../services/api';

interface KnowledgeUploaderProps {
    onUploadComplete: () => void;
}

const KnowledgeUploader: React.FC<KnowledgeUploaderProps> = ({ onUploadComplete }) => {
    const [uploading, setUploading] = useState(false);
    const [url, setUrl] = useState('');

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const uploadData = new FormData();
        uploadData.append('file', file);

        try {
            await api.post('/knowledge/upload', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onUploadComplete();
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Failed to upload file');
        } finally {
            setUploading(false);
            // Reset file input
            e.target.value = '';
        }
    };

    const handleUrlSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) return;

        setUploading(true);
        try {
            await api.post('/knowledge/url', { url });
            setUrl('');
            onUploadComplete();
        } catch (error) {
            console.error('Error adding URL:', error);
            alert('Failed to add URL');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="upload-methods">
            <div className="upload-method">
                <label className="file-upload-btn btn btn-secondary">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="18" x2="12" y2="12" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                    </svg>
                    {uploading ? 'Uploading...' : 'Upload Document'}
                    <input
                        type="file"
                        onChange={handleFileUpload}
                        accept=".pdf,.docx,.txt"
                        style={{ display: 'none' }}
                        disabled={uploading}
                    />
                </label>
            </div>

            <div className="upload-method url-upload">
                <input
                    type="url"
                    className="input"
                    placeholder="https://example.com/article"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={uploading}
                />
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleUrlSubmit}
                    disabled={uploading || !url}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    {uploading ? 'Adding...' : 'Add URL'}
                </button>
            </div>
        </div>
    );
};

export default KnowledgeUploader;
