'use client';

import { useState, useRef } from 'react';
import { Upload, X, Download, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  testId: number;
  onImported: () => void;
  onClose: () => void;
}

export function BulkImportModal({ testId, onImported, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: string[]; total: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.csv')) { toast.error('Only CSV files are supported'); return; }
    setFile(f);
    setResult(null);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('testId', String(testId));

      const res = await fetch('/api/admin/questions/bulk', { method: 'POST', body: formData });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setResult(json.data);
      if (json.data.imported > 0) {
        toast.success(`Imported ${json.data.imported} questions!`);
        onImported();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = [
      'text,text_hindi,option_a,option_b,option_c,option_d,correct,explanation,explanation_hindi,marks,negative_marks,difficulty',
      '"What is the capital of India?","भारत की राजधानी क्या है?",Delhi,Mumbai,Chennai,Kolkata,A,"Delhi is the capital of India","दिल्ली भारत की राजधानी है",1,0.25,easy',
      '"Who wrote the Indian Constitution?",,"B.R. Ambedkar","Mahatma Gandhi","Jawaharlal Nehru","Sardar Patel",A,,, 1, 0.25, medium',
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-overlay">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h2 className="font-bold text-surface-900">Bulk Import Questions</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-100 rounded-lg"><X size={16} /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Template download */}
          <div className="flex items-center justify-between p-3 bg-brand-50 rounded-xl border border-brand-100">
            <div>
              <p className="text-sm font-semibold text-brand-700">Download CSV Template</p>
              <p className="text-xs text-brand-500 mt-0.5">Use this format for your questions</p>
            </div>
            <button onClick={downloadTemplate} className="flex items-center gap-1.5 text-sm text-brand-600 font-medium hover:underline">
              <Download size={14} /> Template
            </button>
          </div>

          {/* CSV Format Info */}
          <div className="bg-surface-50 rounded-xl p-3 text-xs text-surface-600">
            <p className="font-semibold mb-1">Required CSV columns:</p>
            <code className="text-xs break-all">text, option_a, option_b, option_c, option_d, correct</code>
            <p className="mt-1 text-surface-500">Optional: text_hindi, explanation, explanation_hindi, marks, negative_marks, difficulty</p>
          </div>

          {/* File drop zone */}
          <div
            className="border-2 border-dashed border-surface-200 hover:border-brand-300 rounded-xl p-8 text-center cursor-pointer transition-colors"
            onClick={() => inputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          >
            <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {file ? (
              <div className="flex items-center gap-3 justify-center">
                <FileText size={20} className="text-brand-500" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-surface-800">{file.name}</p>
                  <p className="text-xs text-surface-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button onClick={e => { e.stopPropagation(); setFile(null); }} className="ml-2 text-surface-400 hover:text-danger-500">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <Upload size={24} className="text-surface-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-surface-600">Drop CSV file here or click to browse</p>
                <p className="text-xs text-surface-400 mt-1">Only .csv files supported</p>
              </>
            )}
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 bg-success-50 rounded-xl border border-success-100">
                <CheckCircle size={16} className="text-success-500" />
                <p className="text-sm text-success-700">
                  <strong>{result.imported}</strong> of <strong>{result.total}</strong> questions imported successfully
                </p>
              </div>
              {result.errors.length > 0 && (
                <div className="p-3 bg-danger-50 rounded-xl border border-danger-100 max-h-32 overflow-y-auto">
                  <p className="text-xs font-semibold text-danger-700 mb-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {result.errors.length} errors:
                  </p>
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-danger-600">• {e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-surface-100 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary text-sm">Close</button>
          <button
            onClick={handleImport}
            disabled={!file || importing}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Upload size={14} />
            {importing ? 'Importing...' : 'Import Questions'}
          </button>
        </div>
      </div>
    </div>
  );
}
