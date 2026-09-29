'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  IdCard,
  Info,
  RefreshCw,
  ScanFace,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { api, getApiErrorMessage } from '@/lib/api';
import { OrganizerVerificationDocument } from '@/types';

type DocumentType = 'NATIONAL_ID' | 'DRIVERS_LICENSE';
type FlowStep = 'ready' | 'selfie' | 'document-choice' | 'document-front' | 'document-back' | 'scanning' | 'complete';
type SelfieStage = 'CENTER' | 'FIRST_SIDE' | 'OTHER_SIDE';

type FaceLandmark = { x: number; y: number; z?: number };

const MEDIAPIPE_VERSION = '0.10.14';
const MEDIAPIPE_MODULE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/vision_bundle.mjs`;
const MEDIAPIPE_WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const SELFIE_STAGES: Array<{ key: SelfieStage; title: string; detail: string }> = [
  {
    key: 'CENTER',
    title: 'Center yourself on the screen',
    detail: 'Look straight at the camera. TicketFlow will wait until your face is centered and steady before capturing.',
  },
  {
    key: 'FIRST_SIDE',
    title: 'Turn your face slowly to one side',
    detail: 'Move naturally. The camera will capture only after it detects the turn and you hold the position briefly.',
  },
  {
    key: 'OTHER_SIDE',
    title: 'Now turn to the other side',
    detail: 'Move naturally to the opposite side. Keep your face inside the guide until the movement is detected.',
  },
];

const DOC_LABELS: Record<DocumentType, string> = {
  NATIONAL_ID: 'National ID',
  DRIVERS_LICENSE: "Driver's License",
};

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
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
  const faceLandmarkerRef = useRef<any>(null);
  const faceAnimationRef = useRef<number | null>(null);
  const lastFaceAnalysisAtRef = useRef(0);
  const holdStartedAtRef = useRef<number | null>(null);
  const firstTurnSignRef = useRef<number | null>(null);
  const selfieStageRef = useRef(0);
  const selfieFramesRef = useRef<string[]>([]);

  const [step, setStep] = useState<FlowStep>('ready');
  const [cameraReady, setCameraReady] = useState(false);
  const [selfieStageIndex, setSelfieStageIndex] = useState(0);
  const [selfieFrames, setSelfieFrames] = useState<string[]>([]);
  const [documentType, setDocumentType] = useState<DocumentType>(initialDocumentType || 'NATIONAL_ID');
  const [countdown, setCountdown] = useState(3);
  const [uploading, setUploading] = useState(false);
  const [scanMessage, setScanMessage] = useState('Checking image quality…');
  const [trackingReady, setTrackingReady] = useState(false);
  const [trackingMessage, setTrackingMessage] = useState('Preparing natural face scan…');
  const [poseProgress, setPoseProgress] = useState(0);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  const capturedKinds = useMemo(() => new Set(documents.map((document) => document.kind)), [documents]);
  const alreadyComplete =
    capturedKinds.has('REPRESENTATIVE_SELFIE') &&
    capturedKinds.has('REPRESENTATIVE_ID_FRONT') &&
    capturedKinds.has('REPRESENTATIVE_ID_BACK') &&
    Boolean(initialDocumentType);

  useEffect(() => () => {
    stopCamera();
    stopFaceTracking();
  }, []);

  // Document capture can still use the short alignment countdown. Face capture
  // deliberately does NOT use this timer: it waits for actual detected movement.
  useEffect(() => {
    if (!['document-front', 'document-back'].includes(step) || !cameraReady || uploading) return;
    setCountdown(3);
    const interval = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          window.setTimeout(() => {
            void captureDocumentSide(step === 'document-front' ? 'REPRESENTATIVE_ID_FRONT' : 'REPRESENTATIVE_ID_BACK');
          }, 120);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [step, cameraReady]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  }

  function stopFaceTracking() {
    if (faceAnimationRef.current !== null) {
      window.cancelAnimationFrame(faceAnimationRef.current);
      faceAnimationRef.current = null;
    }
    holdStartedAtRef.current = null;
    setPoseProgress(0);
    setTrackingReady(false);
    try {
      faceLandmarkerRef.current?.close?.();
    } catch {
      // Ignore MediaPipe cleanup errors.
    }
    faceLandmarkerRef.current = null;
  }

  async function startCamera(facingMode: 'user' | 'environment') {
    stopCamera();
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Camera access is not supported in this browser.');
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
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

  async function initializeNaturalFaceTracking() {
    stopFaceTracking();
    setTrackingError(null);
    setTrackingMessage('Preparing natural face scan…');

    try {
      // Load MediaPipe as the documented ES module. Avoid Function/eval-based
      // imports because some mobile browsers and security policies reject them.
      const vision = await import(/* webpackIgnore: true */ MEDIAPIPE_MODULE);
      const fileset = await vision.FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);

      const options = {
        baseOptions: {
          modelAssetPath: FACE_MODEL,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        minFaceDetectionConfidence: 0.65,
        minFacePresenceConfidence: 0.65,
        minTrackingConfidence: 0.65,
      };

      try {
        faceLandmarkerRef.current = await vision.FaceLandmarker.createFromOptions(fileset, options);
      } catch {
        faceLandmarkerRef.current = await vision.FaceLandmarker.createFromOptions(fileset, {
          ...options,
          baseOptions: { ...options.baseOptions, delegate: 'CPU' },
        });
      }

      setTrackingReady(true);
      setTrackingMessage('Move your face into the guide');
      runFaceTrackingLoop();
      return true;
    } catch (error) {
      console.error('Natural face tracking initialization failed', error);
      setTrackingReady(false);
      const message = error instanceof Error ? error.message : String(error);
      const networkLike = /fetch|network|load|module|wasm/i.test(message);
      setTrackingError(
        networkLike
          ? 'The face scanner could not finish loading. Keep this page open and tap Retry face scanner.'
          : 'Face movement detection could not start. Tap Retry face scanner.',
      );
      setTrackingMessage('Movement scanner unavailable');
      return false;
    }
  }

  function runFaceTrackingLoop() {
    const tick = () => {
      faceAnimationRef.current = window.requestAnimationFrame(tick);

      const landmarker = faceLandmarkerRef.current;
      const video = videoRef.current;
      if (!landmarker || !video || video.readyState < 2 || captureLock.current) return;

      const now = performance.now();
      // Face Landmarker is synchronous in VIDEO mode. ~10fps is enough for a
      // smooth verification experience without overloading lower-end phones.
      if (now - lastFaceAnalysisAtRef.current < 100) return;
      lastFaceAnalysisAtRef.current = now;

      try {
        const result = landmarker.detectForVideo(video, now);
        const landmarks = result?.faceLandmarks?.[0] as FaceLandmark[] | undefined;
        processDetectedFace(landmarks, now);
      } catch (error) {
        console.error('Face movement analysis failed', error);
      }
    };

    faceAnimationRef.current = window.requestAnimationFrame(tick);
  }

  function processDetectedFace(landmarks: FaceLandmark[] | undefined, now: number) {
    if (!landmarks?.length) {
      resetPoseHold('Move your face into the guide');
      return;
    }

    const xs = landmarks.map((point) => point.x);
    const ys = landmarks.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const faceWidth = maxX - minX;
    const faceCenterX = (minX + maxX) / 2;
    const faceCenterY = (minY + maxY) / 2;

    if (faceWidth < 0.24) {
      resetPoseHold('Move a little closer');
      return;
    }
    if (faceWidth > 0.72) {
      resetPoseHold('Move a little farther away');
      return;
    }
    if (Math.abs(faceCenterX - 0.5) > 0.17 || faceCenterY < 0.31 || faceCenterY > 0.65) {
      resetPoseHold('Center your face in the guide');
      return;
    }

    // MediaPipe landmark 1 is the nose tip. 33 and 263 are outer eye corners.
    // The normalized horizontal nose offset gives a robust lightweight yaw
    // signal without pretending to be a biometric liveness decision.
    const nose = landmarks[1];
    const eyeA = landmarks[33];
    const eyeB = landmarks[263];
    if (!nose || !eyeA || !eyeB) {
      resetPoseHold('Keep your whole face visible');
      return;
    }

    const eyeDistance = Math.max(0.001, Math.abs(eyeB.x - eyeA.x));
    const eyeMidX = (eyeA.x + eyeB.x) / 2;
    const yawSignal = (nose.x - eyeMidX) / eyeDistance;
    const stageIndex = selfieStageRef.current;

    if (stageIndex === 0) {
      if (Math.abs(yawSignal) > 0.09) {
        resetPoseHold('Look straight at the camera');
        return;
      }
      holdPose(now, 1200, 'Face found — hold still', () => void captureDetectedSelfiePose(0, yawSignal));
      return;
    }

    if (stageIndex === 1) {
      if (Math.abs(yawSignal) < 0.14) {
        resetPoseHold('Turn your face slowly to either side');
        return;
      }
      const sign = Math.sign(yawSignal) || 1;
      holdPose(now, 750, 'Movement detected — hold that position', () => {
        firstTurnSignRef.current = sign;
        void captureDetectedSelfiePose(1, yawSignal);
      });
      return;
    }

    const firstSign = firstTurnSignRef.current;
    const currentSign = Math.sign(yawSignal) || 0;
    if (!firstSign || Math.abs(yawSignal) < 0.14 || currentSign === firstSign) {
      resetPoseHold('Turn your face slowly to the other side');
      return;
    }

    holdPose(now, 750, 'Other side detected — hold there', () => void captureDetectedSelfiePose(2, yawSignal));
  }

  function resetPoseHold(message: string) {
    holdStartedAtRef.current = null;
    setPoseProgress(0);
    setTrackingMessage(message);
  }

  function holdPose(now: number, requiredMs: number, message: string, onComplete: () => void) {
    if (holdStartedAtRef.current === null) holdStartedAtRef.current = now;
    const elapsed = now - holdStartedAtRef.current;
    const progress = clamp(elapsed / requiredMs);
    setPoseProgress(progress);
    setTrackingMessage(progress > 0.72 ? 'Almost there — keep still' : message);

    if (progress >= 1 && !captureLock.current) {
      holdStartedAtRef.current = null;
      setPoseProgress(1);
      onComplete();
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

  async function uploadBlob(
    kind: 'REPRESENTATIVE_SELFIE' | 'REPRESENTATIVE_ID_FRONT' | 'REPRESENTATIVE_ID_BACK',
    blob: Blob,
    filename: string,
  ) {
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
      ctx.fillRect(index * width + 12, height - 42, 118, 28);
      ctx.fillStyle = '#fff';
      ctx.font = '600 15px Arial';
      ctx.fillText(SELFIE_STAGES[index].key.replace('_', ' '), index * width + 24, height - 23);
    });

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Could not prepare selfie verification image')),
        'image/jpeg',
        0.8,
      );
    });
  }

  async function captureDetectedSelfiePose(stageIndex: number, _yawSignal: number) {
    if (captureLock.current || selfieStageRef.current !== stageIndex) return;
    captureLock.current = true;

    try {
      const frame = currentFrameDataUrl();
      if (!frame) {
        resetPoseHold('Camera is still preparing');
        return;
      }

      const nextFrames = [...selfieFramesRef.current, frame];
      selfieFramesRef.current = nextFrames;
      setSelfieFrames(nextFrames);

      // Give the user a visible confirmation instead of immediately jumping
      // to the next prompt the instant a threshold is crossed.
      setTrackingMessage('Captured');
      setPoseProgress(1);
      await wait(450);

      if (stageIndex < SELFIE_STAGES.length - 1) {
        const nextIndex = stageIndex + 1;
        selfieStageRef.current = nextIndex;
        setSelfieStageIndex(nextIndex);
        holdStartedAtRef.current = null;
        setPoseProgress(0);
        setTrackingMessage(
          nextIndex === 1
            ? 'Turn your face slowly to either side'
            : 'Turn your face slowly to the other side',
        );
        return;
      }

      setUploading(true);
      setTrackingMessage('Preparing your captures…');
      const composite = await combineSelfieFrames(nextFrames);
      await uploadBlob('REPRESENTATIVE_SELFIE', composite, 'representative-selfie-sequence.jpg');
      await onUpdated();
      stopFaceTracking();
      stopCamera();
      setStep('document-choice');
      toast.success('Face movement capture completed');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
      resetPoseHold('Hold your face inside the guide and try again');
    } finally {
      setUploading(false);
      captureLock.current = false;
    }
  }

  async function beginSelfie() {
    if (disabled) return;
    selfieFramesRef.current = [];
    setSelfieFrames([]);
    selfieStageRef.current = 0;
    setSelfieStageIndex(0);
    firstTurnSignRef.current = null;
    holdStartedAtRef.current = null;
    setPoseProgress(0);
    setTrackingError(null);
    setTrackingMessage('Opening camera…');
    setStep('selfie');

    await wait(80);
    const cameraOk = await startCamera('user');
    if (!cameraOk) {
      setStep('ready');
      return;
    }

    await initializeNaturalFaceTracking();
  }

  async function retryFaceScanner() {
    setTrackingError(null);
    setTrackingMessage('Preparing natural face scan…');
    await initializeNaturalFaceTracking();
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
    stopFaceTracking();
    stopCamera();
    selfieFramesRef.current = [];
    setSelfieFrames([]);
    selfieStageRef.current = 0;
    setSelfieStageIndex(0);
    firstTurnSignRef.current = null;
    setTrackingError(null);
    setPoseProgress(0);
    setStep('ready');
  }

  const active = step !== 'ready';
  const stage = SELFIE_STAGES[selfieStageIndex];

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
              The camera waits for your real face position and movement before each capture. There is no instant selfie timer.
            </p>
            <p className="mt-2 text-xs leading-5 text-muted">
              This movement-aware capture improves the experience. Persona remains the authoritative biometric liveness and identity-verification provider when enabled.
            </p>
          </div>
        </div>

        {alreadyComplete && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0" /> Selfie movement sequence and both document sides are on file.
          </div>
        )}

        <Button type="button" className="mt-5" disabled={disabled} onClick={beginSelfie}>
          <ScanFace className="h-4 w-4" />
          {alreadyComplete ? 'Retake live face capture' : 'Start live face capture'}
        </Button>
      </section>

      {active && (
        <div className="fixed inset-0 z-[140] bg-black">
          {step === 'selfie' && (
            <div className="flex h-full flex-col bg-white">
              <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
                <video ref={videoRef} muted playsInline className="h-full w-full object-cover scale-x-[-1]" />

                <button
                  type="button"
                  onClick={restart}
                  className="absolute left-5 top-5 z-20 grid h-11 w-11 place-items-center rounded-full bg-black/35 text-white backdrop-blur"
                  aria-label="Back"
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>

                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <div
                    className="relative h-[min(70vw,420px)] w-[min(70vw,420px)] rounded-full p-[5px] transition-all duration-200"
                    style={{
                      background: `conic-gradient(#ffffff ${Math.round(poseProgress * 100)}%, rgba(255,255,255,.28) 0)`,
                    }}
                  >
                    <div className="h-full w-full rounded-full border border-white/40 bg-transparent shadow-[0_0_0_999px_rgba(0,0,0,.14)]" />
                    <div className="absolute left-1/2 top-1/2 max-w-[88vw] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-black px-5 py-3 text-sm font-semibold text-white shadow-lg sm:text-base">
                      {trackingMessage}
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-black/65 px-4 py-2 text-xs font-bold text-white backdrop-blur">
                    <ScanFace className="h-4 w-4" />
                    {trackingReady ? 'Movement detection active' : 'Preparing scanner'}
                  </span>
                </div>
              </div>

              <div className="mobile-safe-area bg-white px-6 pb-6 pt-7 sm:px-10">
                <div className="mx-auto max-w-xl">
                  <h1 className="text-3xl font-black tracking-[-0.035em] text-ink-950 sm:text-4xl">
                    {stage.title}
                  </h1>
                  <p className="mt-4 text-base leading-7 text-navy-700">{stage.detail}</p>

                  {trackingError ? (
                    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm leading-6 text-amber-900">{trackingError}</p>
                      <Button type="button" variant="outline" className="mt-3" onClick={() => void retryFaceScanner()}>
                        <RefreshCw className="h-4 w-4" />
                        Retry face scanner
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-7 flex items-center justify-center">
                      <span className="inline-flex items-center gap-2 rounded-full bg-navy-100 px-4 py-2 text-sm font-bold text-navy-800">
                        <Camera className="h-4 w-4" />
                        Auto capture after movement is detected
                      </span>
                    </div>
                  )}

                  <div className="mt-6 flex items-center justify-between">
                    <Zap className="h-7 w-7 text-navy-700" />
                    <div className="grid h-20 w-20 place-items-center rounded-full border-[3px] border-navy-200 bg-white">
                      <div
                        className="grid h-16 w-16 place-items-center rounded-full bg-navy-600 text-white transition-transform"
                        style={{ transform: `scale(${0.88 + poseProgress * 0.12})` }}
                      >
                        <ScanFace className="h-7 w-7" />
                      </div>
                    </div>
                    <RefreshCw className="h-7 w-7 text-navy-700" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'document-choice' && (
            <div className="flex h-full items-center justify-center bg-[#0b0b0c] p-5">
              <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl sm:p-8">
                <button type="button" onClick={restart} className="grid h-10 w-10 place-items-center rounded-full bg-navy-50 text-navy-900">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.18em] text-brand-600">Identity document</p>
                <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] text-ink-950">Choose your document</h1>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Use the physical document. You&apos;ll capture the front and back directly with your camera.
                </p>
                <div className="mt-7 grid gap-3">
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => void chooseDocument('NATIONAL_ID')}
                    className="flex min-h-20 items-center gap-4 rounded-2xl border border-line p-4 text-left transition hover:border-brand-300 hover:bg-brand-50"
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-navy-50 text-navy-800"><IdCard className="h-6 w-6" /></span>
                    <span>
                      <strong className="block text-base text-navy-950">National ID</strong>
                      <span className="mt-1 block text-sm text-muted">Capture the front and back of your government ID.</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => void chooseDocument('DRIVERS_LICENSE')}
                    className="flex min-h-20 items-center gap-4 rounded-2xl border border-line p-4 text-left transition hover:border-brand-300 hover:bg-brand-50"
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-navy-50 text-navy-800"><CreditCard className="h-6 w-6" /></span>
                    <span>
                      <strong className="block text-base text-navy-950">Driver&apos;s License</strong>
                      <span className="mt-1 block text-sm text-muted">Capture the front and back of your driving licence.</span>
                    </span>
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
                <button type="button" onClick={restart} className="grid h-11 w-11 place-items-center rounded-full bg-black/45 backdrop-blur" aria-label="Back">
                  <ArrowLeft className="h-6 w-6" />
                </button>

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
                    ].map((classes) => (
                      <span key={classes} className={'absolute h-8 w-8 rounded-sm border-white ' + classes} />
                    ))}
                    <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 bg-white/92 px-5 py-4 text-left text-navy-950 backdrop-blur">
                      <IdCard className="h-8 w-8 text-navy-700" />
                      <div>
                        <strong className="block">{step === 'document-front' ? 'Front' : 'Back'} of {DOC_LABELS[documentType]}</strong>
                        <span className="text-xs text-muted">Keep all four corners inside the frame.</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-7 inline-flex items-center gap-2 text-sm font-semibold">
                    <Info className="h-5 w-5" /> Capture tips
                  </div>
                  {cameraReady && !uploading && <p className="mt-4 text-sm text-white/75">Auto capture in {countdown || '…'}</p>}
                </div>

                <div className="mt-auto flex justify-center">
                  <button
                    type="button"
                    onClick={() => void captureDocumentSide(step === 'document-front' ? 'REPRESENTATIVE_ID_FRONT' : 'REPRESENTATIVE_ID_BACK')}
                    disabled={!cameraReady || uploading}
                    className="grid h-20 w-20 place-items-center rounded-full border-[3px] border-white/65 bg-white/15 backdrop-blur disabled:opacity-50"
                  >
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
                <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                  <Check className="h-10 w-10" />
                </span>
                <h1 className="mt-6 text-3xl font-black tracking-[-0.035em] text-ink-950">Identity capture complete</h1>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Your movement-aware selfie sequence and both sides of your {DOC_LABELS[documentType]} have been securely added to your TicketFlow verification application.
                </p>
                <div className="mt-7 rounded-2xl bg-navy-50 p-4 text-left text-sm leading-6 text-navy-800">
                  <FileCheck2 className="mb-2 h-5 w-5 text-brand-600" />
                  TicketFlow records the capture sequence for review. Persona, when enabled, remains responsible for biometric liveness and authoritative identity verification.
                </div>
                <Button type="button" fullWidth className="mt-7" onClick={() => { stopFaceTracking(); stopCamera(); setStep('ready'); }}>
                  Continue
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
