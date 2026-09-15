import React, { useRef, useState } from 'react';
import { FileText, UploadCloud, CheckCircle2, X, LoaderCircle } from 'lucide-react';
import { extractDocumentText } from '../lib/documentReader';
import { useVeeBee } from '../context';

export default function Dropzone({
  label = 'Upload resume',
  accept = '.pdf,.docx,.txt',
  onFile,
  onText,
  helper = 'PDF / DOCX / TXT',
}) {
  const inputRef = useRef(null);
  const { setResume } = useVeeBee();
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');

  async function handle(f) {
    if (!f) return;
    setError('');
    setFile(f);
    onFile?.(f);
    setReading(true);
    try {
      const text = await extractDocumentText(f);
      onText?.(text);
      setResume({ file: f, text, name: f.name });
    } catch (err) {
      setError(err.message || 'Unable to read this file.');
      onText?.('');
    } finally {
      setReading(false);
    }
  }

  function clear(e) {
    e.stopPropagation();
    setFile(null);
    setError('');
    onFile?.(null);
    onText?.('');
    setResume({ file: null, text: '', name: '' });
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div>
      <div
        className={`dropzone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files?.[0]); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
      >
        <input ref={inputRef} type="file" accept={accept} hidden onChange={(e) => handle(e.target.files?.[0])} />
        <div className="drop-icon">
          {reading ? <LoaderCircle className="spin" /> : file ? <CheckCircle2 /> : <UploadCloud />}
        </div>
        <div className="drop-copy">
          <strong>{file ? file.name : label}</strong>
          <span>{reading ? 'Reading document text…' : file ? `${Math.max(1, Math.round(file.size / 1024))} KB · extracted and ready` : `Drop here or click to browse · ${helper}`}</span>
        </div>
        {file ? <button type="button" className="drop-clear" aria-label="Remove file" onClick={clear}><X size={16} /></button> : <FileText size={20} className="drop-file" />}
      </div>
      {error && <div className="file-error">{error}</div>}
    </div>
  );
}
