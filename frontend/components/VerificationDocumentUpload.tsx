'use client';

import { ChangeEvent, useRef, useState } from 'react';
import { Camera, Eye, FileText, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { api, getApiErrorMessage } from '@/lib/api';
import { OrganizerVerificationDocument, OrganizerVerificationDocumentKind } from '@/types';

const ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';
const MAX_BYTES = 5 * 1024 * 1024;

export default function VerificationDocumentUpload({
  kind,
  label,
  hint,
  document,
  disabled,
  onUploaded,
}: {
  kind: OrganizerVerificationDocumentKind;
  label: string;
  hint?: string;
  document?: OrganizerVerificationDocument;
  disabled?: boolean;
  onUploaded: () => Promise<unknown> | unknown;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [opening, setOpening] = useState(false);

  async function handleFile(file?: File) {
    if (!file) return;
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Use a PDF, JPG or PNG file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('The document must be 5 MB or smaller.');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post('/organizers/me/verification/documents/' + kind + '/upload', formData);
      await onUploaded();
      toast.success(document ? 'Document replaced' : 'Document uploaded');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
      if (cameraInput.current) cameraInput.current.value = '';
    }
  }

  async function openDocument() {
    if (!document) return;
    setOpening(true);
    try {
      const response = await api.get('/organizers/me/verification/documents/' + kind + '/file', { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setOpening(false);
    }
  }

  function selected(event: ChangeEvent<HTMLInputElement>) {
    void handleFile(event.target.files?.[0]);
  }

  return (
    <div className="rounded-card border border-line bg-white p-4 shadow-soft sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy-50 text-navy-700">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-extrabold text-navy-900">{label}</h3>
          {hint && <p className="mt-1 text-xs leading-5 text-muted">{hint}</p>}
          {document && (
            <p className="mt-2 truncate text-xs font-semibold text-emerald-700">
              Uploaded: {document.fileName} · {(document.sizeBytes / 1024 / 1024).toFixed(2)} MB
            </p>
          )}
        </div>
      </div>

      <input ref={fileInput} className="sr-only" type="file" accept={ACCEPT} onChange={selected} disabled={disabled || uploading} />
      <input ref={cameraInput} className="sr-only" type="file" accept="image/*" capture="environment" onChange={selected} disabled={disabled || uploading} />

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={disabled} loading={uploading} onClick={() => fileInput.current?.click()}>
          <Upload className="h-4 w-4" aria-hidden="true" />
          {document ? 'Replace file' : 'Choose file'}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={disabled || uploading} onClick={() => cameraInput.current?.click()}>
          <Camera className="h-4 w-4" aria-hidden="true" />
          Take photo
        </Button>
        {document && (
          <Button type="button" variant="ghost" size="sm" loading={opening} onClick={openDocument}>
            <Eye className="h-4 w-4" aria-hidden="true" />
            View
          </Button>
        )}
      </div>
    </div>
  );
}
