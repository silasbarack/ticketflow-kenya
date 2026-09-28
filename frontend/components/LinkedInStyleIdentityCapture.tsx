'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Camera, Check, CheckCircle2, CreditCard, FileCheck2, IdCard, Info, RefreshCw, ShieldCheck, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { api, getApiErrorMessage } from '@/lib/api';
import { OrganizerVerificationDocument } from '@/types';

type DocumentType = 'NATIONAL_ID' | 'DRIVERS_LICENSE';
type FlowStep = 'ready' | 'selfie' | 'document-choice' | 'document-front' | 'document-back' | 'scanning' | 'complete';
type SelfieStage = 'CENTER' | 'LEFT' | 'RIGHT';

const SELFIE_STAGES: Array<{ key: SelfieStage; title: string; detail: string }> = [
  { key: 'CENTER', title: 'Center yourself on the screen', detail: 'Position your face in the center of the camera until the photo is taken.' },
  { key: 'LEFT', title: 'Turn your face slightly to the left', detail: 'Keep your face inside the guide and turn naturally to your left.' },
  { key: 'RIGHT', title: 'Turn your face slightly to the right', detail: 'Keep your face inside the guide and turn naturally to your right.' },
];

const DOC_LABELS: Record<DocumentType, string> = {
  NATIONAL_ID: 'National ID',
  DRIVERS_LICENSE: "Driver's License",
};

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function LinkedInStyleIdentityCapture({
  documents,
  disabled,
  initialDocumentType,
  onPersistDetails,
  onUpdated,
}: {
  documents: OrganizerVerificationDocument[];
  disabled?: boolean;
  initialDocumentType?: DocumentType | null;
  onPersistDetails: (documentType: DocumentType) => Promise<void>;
  onUpdated: () => Promise<unknown> | unknown;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureLock = useRef(false);
  const [step, setStep] = useState<FlowStep>('ready');
  const [cameraReady, setCameraReady] = useState(false);
  const [selfieStageIndex, setSelfieStageIndex] = useState(0);
  const [selfieFrames, setSelfieFrames] = useState<string[]>([]);
  const [documentType, setDocumentType] = useState<DocumentType>(initialDocumentType || 'NATIONAL_ID');
  const [countdown, setCountdown] = useState(3);
  const [uploading, setUploading] = useState(false);
  const [scanMessage, setScanMessage] = useState('Checking image quality…');

  const capturedKinds = useMemo(() => new Set(documents.map((document) => document.kind)), [documents]);
  const alreadyComplete =
    capturedKinds.has('REPRESENTATIVE_SELFIE') &&
    capturedKinds.has('REPRESENTATIVE_ID_FRONT') &&
    capturedKinds.has('REPRESENTATIVE_ID_BACK') &&
    Boolean(initialDocumentType);

  useEffect(() => () => stopCamera(), []);

  useEffect(() => {
    if (!['selfie', 'document-front', 'document-back'].includes(step) || !cameraReady || uploading) return;
    setCountdown(3);
    const interval = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          window.setTimeout(() => {
            if (step === 'selfie') void captureSelfieStage();
            else void captureDocumentSide(step === 'document-front' ? 'REPRESENTATIVE_ID_FRONT' : 'REPRESENTATIVE_ID_BACK');
          }, 120);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [step, cameraReady, selfieStageIndex]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  }

  async function startCamera(facingMode: 'user' | 'environment') {
    stopCamera();
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Camera access is not supported in this browser.');
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
      return true;
    } catch {
      toast.error('Allow camera access to continue with identity verification.');
      return false;
    }
  }

  function currentFrameDataUrl() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return null;
    const canvas = document.createElement('canvas');
    const targetWidth = Math.min(video.videoWidth, 960);
    const ratio = targetWidth / video.videoWidth;
    canvas.width = targetWidth;
    canvas.height = Math.round(video.videoHeight * ratio);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.78);
  }

  async function dataUrlToBlob(dataUrl: string) {
    const response = await fetch(dataUrl);
    return response.blob();
  }

  async function uploadBlob(kind: 'REPRESENTATIVE_SELFIE' | 'REPRESENTATIVE_ID_FRONT' | 'REPRESENTATIVE_ID_BACK', blob: Blob, filename: string) {
    const formData = new FormData();
    formData.append('file', new File([blob], filename, { type: 'image/jpeg' }));
    await api.post('/organizers/me/verification/documents/' + kind + '/upload', formData);
  }

  async function combineSelfieFrames(frames: string[]) {
    const images = await Promise.all(frames.map((source) => new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = source;
    })));
    const width = 420;
    const height = 420;
    const canvas = document.createElement('canvas');
    canvas.width = width * 3;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not prepare selfie verification image');

    images.forEach((image, index) => {
      const scale = Math.max(width / image.width, height / image.height);
      const sourceWidth = width / scale;
      const sourceHeight = height / scale;
      const sx = (image.width - sourceWidth) / 2;
      const sy = (image.height - sourceHeight) / 2;
      ctx.drawImage(image, sx, sy, sourceWidth, sourceHeight, index * width, 0, width, height);
      ctx.fillStyle = 'rgba(0,0,0,.62)';
      ctx.fillRect(index * width + 12, height - 42, 92, 28);
      ctx.fillStyle = '#fff';
      ctx.font = '600 15px Arial';
      ctx.fillText(SELFIE_STAGES[index].key, index * width + 24, height - 23);
    });

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not prepare selfie verification image')), 'image/jpeg', 0.8);
    });
  }

  async function captureSelfieStage() {
    if (captureLock.current) return;
    captureLock.current = true;
    try {
      const frame = currentFrameDataUrl();
      if (!frame) {
        toast.error('Camera is not ready yet. Try again.');
        return;
      }
      const nextFrames = [...selfieFrames, frame];
      setSelfieFrames(nextFrames);
      if (selfieStageIndex < SELFIE_STAGES.length - 1) {
        setSelfieStageIndex((current) => current + 1);
        setCountdown(3);
        return;
      }

      setUploading(true);
      const composite = await combineSelfieFrames(nextFrames);
      await uploadBlob('REPRESENTATIVE_SELFIE', composite, 'representative-selfie-sequence.jpg');
      await onUpdated();
      stopCamera();
      setStep('document-choice');
      toast.success('Selfie capture completed');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setUploading(false);
      captureLock.current = false;
    }
  }

  async function beginSelfie() {
    if (disabled) return;
    setSelfieFrames([]);
    setSelfieStageIndex(0);
    setStep('selfie');
    await wait(80);
    const ok = await startCamera('user');
    if (!ok) setStep('ready');
  }

  async function chooseDocument(type: DocumentType) {
    if (disabled) return;
    setDocumentType(type);
    try {
      setUploading(true);
      await onPersistDetails(type);
      setStep('document-front');
      await wait(80);
      const ok = await startCamera('environment');
      if (!ok) setStep('document-choice');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save representative details before continuing.');
    } finally {
      setUploading(false);
    }
  }

  async function captureDocumentSide(kind: 'REPRESENTATIVE_ID_FRONT' | 'REPRESENTATIVE_ID_BACK') {
    if (captureLock.current) return;
    captureLock.current = true;
    try {
      const frame = currentFrameDataUrl();
      if (!frame) {
        toast.error('Camera is not ready yet. Try again.');
        return;
      }
      setUploading(true);
      const blob = await dataUrlToBlob(frame);
      const side = kind === 'REPRESENTATIVE_ID_FRONT' ? 'front' : 'back';
      await uploadBlob(kind, blob, documentType.toLowerCase() + '-' + side + '.jpg');
      await onUpdated();

      if (kind === 'REPRESENTATIVE_ID_FRONT') {
        setScanMessage('Front captured. Preparing the back…');
        stopCamera();
        setStep('scanning');
        await wait(900);
        setStep('document-back');
        await wait(80);
        const ok = await startCamera('environment');
        if (!ok) setStep('document-choice');
      } else {
        stopCamera();
        setScanMessage('Checking image quality and preparing your documents for review…');
        setStep('scanning');
        await wait(1600);
        setStep('complete');
        await onUpdated();
        toast.success('Identity evidence captured');
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setUploading(false);
      captureLock.current = false;
    }
  }

  async function restart() {
    stopCamera();
    setSelfieFrames([]);
    setSelfieStageIndex(0);
    setStep('ready');
  }

  const active = step !== 'ready';

  return (
    <>
      <section className="rounded-card border border-line bg-white p-5 shadow-soft sm:p-6">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-extrabold text-navy-900">Identity verification</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Use a live camera to capture a guided selfie and both sides of your National ID or Driver&apos;s License.
            </p>
            <p className="mt-2 text-xs leading-5 text-muted">
              The camera flow collects evidence for TicketFlow review. It does not claim automated biometric or government-database verification.
            </p>
          </div>
        </div>

        {alreadyComplete && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0" /> Selfie and both document sides are on file.
          </div>
        )}

        <Button type="button" className="mt-5" disabled={disabled} onClick={beginSelfie}>
          <Camera className="h-4 w-4" />
          {alreadyComplete ? 'Retake identity verification' : 'Start identity verification'}
        </Button>
      </section>

      {active && (
        <div className="fixed inset-0 z-[140] bg-black">
          {step === 'selfie' && (
            <div className="flex h-full flex-col bg-white">
              <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
                <video ref={videoRef} muted playsInline className="h-full w-full object-cover scale-x-[-1]" />
                <button type="button" onClick={restart} className="absolute left-5 top-5 z-20 grid h-11 w-11 place-items-center rounded-full bg-black/35 text-white backdrop-blur" aria-label="Back">
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <div className="relative h-[min(70vw,420px)] w-[min(70vw,420px)] rounded-full border-[5px] border-white/95 shadow-[0_0_0_999px_rgba(0,0,0,.12)]">
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-black px-5 py-3 text-sm font-semibold text-white shadow-lg sm:text-base">
                      {SELFIE_STAGES[selfieStageIndex].title}
                    </div>
                  </div>
                </div>
                {cameraReady && !uploading && (
                  <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-sm font-bold text-white backdrop-blur">
                    Auto capture in {countdown || '…'}
                  </div>
                )}
              </div>

              <div className="mobile-safe-area bg-white px-6 pb-6 pt-7 sm:px-10">
                <div className="mx-auto max-w-xl">
                  <h1 className="text-3xl font-black tracking-[-0.035em] text-ink-950 sm:text-4xl">{SELFIE_STAGES[selfieStageIndex].title}</h1>
                  <p className="mt-4 text-base leading-7 text-navy-700">{SELFIE_STAGES[selfieStageIndex].detail}</p>
                  <div className="mt-7 flex items-center justify-center">
                    <span className="inline-flex items-center gap-2 rounded-full bg-navy-100 px-4 py-2 text-sm font-bold text-navy-800">
                      <Camera className="h-4 w-4" /> Auto capture on
                    </span>
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <Zap className="h-7 w-7 text-navy-700" />
                    <button type="button" onClick={() => void captureSelfieStage()} disabled={!cameraReady || uploading} className="grid h-20 w-20 place-items-center rounded-full border-[3px] border-navy-200 bg-white disabled:opacity-50">
                      <span className="h-16 w-16 rounded-full bg-navy-600 shadow-inner" />
                    </button>
                    <RefreshCw className="h-7 w-7 text-navy-700" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'document-choice' && (
            <div className="flex h-full items-center justify-center bg-[#0b0b0c] p-5">
              <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl sm:p-8">
                <button type="button" onClick={restart} className="grid h-10 w-10 place-items-center rounded-full bg-navy-50 text-navy-900"><ArrowLeft className="h-5 w-5" /></button>
                <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.18em] text-brand-600">Identity document</p>
                <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] text-ink-950">Choose your document</h1>
                <p className="mt-3 text-sm leading-6 text-muted">Use the physical document. You&apos;ll capture the front and back directly with your camera.</p>
                <div className="mt-7 grid gap-3">
                  <button type="button" disabled={uploading} onClick={() => void chooseDocument('NATIONAL_ID')} className="flex min-h-20 items-center gap-4 rounded-2xl border border-line p-4 text-left transition hover:border-brand-300 hover:bg-brand-50">
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-navy-50 text-navy-800"><IdCard className="h-6 w-6" /></span>
                    <span><strong className="block text-base text-navy-950">National ID</strong><span className="mt-1 block text-sm text-muted">Capture the front and back of your government ID.</span></span>
                  </button>
                  <button type="button" disabled={uploading} onClick={() => void chooseDocument('DRIVERS_LICENSE')} className="flex min-h-20 items-center gap-4 rounded-2xl border border-line p-4 text-left transition hover:border-brand-300 hover:bg-brand-50">
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-navy-50 text-navy-800"><CreditCard className="h-6 w-6" /></span>
                    <span><strong className="block text-base text-navy-950">Driver&apos;s License</strong><span className="mt-1 block text-sm text-muted">Capture the front and back of your driving licence.</span></span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {(step === 'document-front' || step === 'document-back') && (
            <div className="relative flex h-full flex-col bg-black text-white">
              <video ref={videoRef} muted playsInline className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-black/28" />
              <div className="relative z-10 flex h-full flex-col px-5 pb-8 pt-5 sm:px-8">
                <button type="button" onClick={restart} className="grid h-11 w-11 place-items-center rounded-full bg-black/45 backdrop-blur" aria-label="Back"><ArrowLeft className="h-6 w-6" /></button>
                <div className="mx-auto mt-12 w-full max-w-2xl text-center">
                  <div className="rounded-xl bg-black/70 px-5 py-4 text-lg font-semibold backdrop-blur">
                    Take a clear photo of the {step === 'document-front' ? 'front' : 'back'} of your {DOC_LABELS[documentType]}.
                  </div>

                  <div className="relative mx-auto mt-8 aspect-[1.58/1] w-full max-w-xl overflow-hidden rounded-2xl border-4 border-white shadow-2xl">
                    <div className="absolute inset-0 bg-black/5" />
                    {[
                      'left-5 top-5 border-l-4 border-t-4',
                      'right-5 top-5 border-r-4 border-t-4',
                      'bottom-5 left-5 border-b-4 border-l-4',
                      'bottom-5 right-5 border-b-4 border-r-4',
                    ].map((classes) => <span key={classes} className={'absolute h-8 w-8 rounded-sm border-white ' + classes} />)}
                    <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 bg-white/92 px-5 py-4 text-left text-navy-950 backdrop-blur">
                      <IdCard className="h-8 w-8 text-navy-700" />
                      <div><strong className="block">{step === 'document-front' ? 'Front' : 'Back'} of {DOC_LABELS[documentType]}</strong><span className="text-xs text-muted">Keep all four corners inside the frame.</span></div>
                    </div>
                  </div>

                  <div className="mt-7 inline-flex items-center gap-2 text-sm font-semibold"><Info className="h-5 w-5" /> Capture tips</div>
                  {cameraReady && !uploading && <p className="mt-4 text-sm text-white/75">Auto capture in {countdown || '…'}</p>}
                </div>
                <div className="mt-auto flex justify-center">
                  <button type="button" onClick={() => void captureDocumentSide(step === 'document-front' ? 'REPRESENTATIVE_ID_FRONT' : 'REPRESENTATIVE_ID_BACK')} disabled={!cameraReady || uploading} className="grid h-20 w-20 place-items-center rounded-full border-[3px] border-white/65 bg-white/15 backdrop-blur disabled:opacity-50">
                    <span className="h-16 w-16 rounded-full bg-white" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'scanning' && (
            <div className="flex h-full items-center justify-center bg-[#09090a] p-6 text-white">
              <div className="w-full max-w-xl text-center">
                <div className="relative mx-auto aspect-[1.58/1] w-full overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-zinc-800 to-zinc-950 shadow-2xl">
                  <div className="absolute inset-x-5 top-5 h-1 bg-brand-500 shadow-[0_0_22px_rgba(230,0,45,.9)] animate-[tf-document-scan_1.7s_ease-in-out_infinite]" />
                  <div className="absolute inset-0 grid place-items-center"><IdCard className="h-24 w-24 text-white/20" /></div>
                </div>
                <h1 className="mt-8 text-3xl font-black">Preparing your document</h1>
                <p className="mt-3 text-sm leading-6 text-white/65">{scanMessage}</p>
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className="flex h-full items-center justify-center bg-white p-6">
              <div className="w-full max-w-lg text-center">
                <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-10 w-10" /></span>
                <h1 className="mt-6 text-3xl font-black tracking-[-0.035em] text-ink-950">Identity capture complete</h1>
                <p className="mt-3 text-sm leading-6 text-muted">Your selfie sequence and both sides of your {DOC_LABELS[documentType]} have been securely added to your TicketFlow verification application.</p>
                <div className="mt-7 rounded-2xl bg-navy-50 p-4 text-left text-sm leading-6 text-navy-800">
                  <FileCheck2 className="mb-2 h-5 w-5 text-brand-600" />
                  TicketFlow will review this evidence together with your company documents. This screen does not represent a government-database identity match.
                </div>
                <Button type="button" fullWidth className="mt-7" onClick={() => { stopCamera(); setStep('ready'); }}>Continue</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
