'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, RefreshCw, Loader2, AlertCircle, Camera } from 'lucide-react';
import toast from 'react-hot-toast';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
}: BarcodeScannerModalProps) {
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  const html5QrCodeRef = useRef<any>(null);
  const scannerContainerId = 'barcode-scanner-viewport';

  // Load and start scanner
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    let html5QrCodeInstance: any = null;

    const initScanner = async () => {
      try {
        setLoading(true);
        setErrorMsg('');
        
        // Dynamically import to prevent Next.js SSR error
        const { Html5Qrcode } = await import('html5-qrcode');
        
        if (!isMounted) return;

        // Create container if not exists yet
        const container = document.getElementById(scannerContainerId);
        if (!container) {
          throw new Error('Scanner container element not found');
        }

        html5QrCodeInstance = new Html5Qrcode(scannerContainerId);
        html5QrCodeRef.current = html5QrCodeInstance;

        // Try to get available cameras
        let devices: any[] = [];
        try {
          devices = await Html5Qrcode.getCameras();
          if (isMounted) {
            const formattedDevices = devices.map(d => ({
              id: d.id,
              label: d.label || `Camera ${devices.indexOf(d) + 1}`
            }));
            setCameras(formattedDevices);
          }
        } catch (camErr) {
          console.warn('Failed to get cameras catalog, trying direct facingMode:', camErr);
        }

        const handleSuccess = (decodedText: string) => {
          // Play a visual & physical feedback if possible
          if (navigator.vibrate) {
            navigator.vibrate(100);
          }
          toast.success(`สแกนสำเร็จ: ${decodedText}`);
          
          // Stop camera and trigger success
          stopCamera().then(() => {
            onScanSuccess(decodedText);
          });
        };

        const config = {
          fps: 15,
          qrbox: (width: number, height: number) => {
            // Make qrbox responsive
            const size = Math.min(width, height) * 0.7;
            return { width: size, height: size * 0.6 }; // Wider rectangular box for EAN barcodes
          },
          aspectRatio: 1.0,
        };

        // Try to start with environment (back) camera first
        try {
          await html5QrCodeInstance.start(
            { facingMode: 'environment' },
            config,
            handleSuccess,
            () => {} // silent error logging to prevent console pollution
          );
          
          if (isMounted) {
            setLoading(false);
          }
        } catch (startErr) {
          console.warn('Failed to start environment camera, trying first device:', startErr);
          
          if (devices.length > 0) {
            const firstDevice = devices[0].id;
            await html5QrCodeInstance.start(
              firstDevice,
              config,
              handleSuccess,
              () => {}
            );
            if (isMounted) {
              setActiveCameraId(firstDevice);
              setLoading(false);
            }
          } else {
            throw new Error('ไม่สามารถเข้าใช้งานกล้องถ่ายรูปได้ หรือไม่พบอุปกรณ์กล้อง');
          }
        }
      } catch (err: any) {
        console.error('Scanner init error:', err);
        if (isMounted) {
          setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการเปิดกล้อง');
          setLoading(false);
        }
      }
    };

    // Tiny delay to ensure DOM is fully painted
    const timer = setTimeout(() => {
      initScanner();
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      
      // Stop and clean up scanner instance on unmount
      if (html5QrCodeInstance && html5QrCodeInstance.isScanning) {
        html5QrCodeInstance.stop().catch((e: any) => console.error('Error stopping on unmount:', e));
      }
    };
  }, [isOpen]);

  const stopCamera = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error('Error stopping camera:', err);
      }
    }
  };

  const handleClose = async () => {
    await stopCamera();
    onClose();
  };

  const handleCameraChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = e.target.value;
    if (!deviceId || !html5QrCodeRef.current) return;

    setLoading(true);
    setErrorMsg('');
    setActiveCameraId(deviceId);

    try {
      await stopCamera();
      
      const handleSuccess = (decodedText: string) => {
        if (navigator.vibrate) navigator.vibrate(100);
        toast.success(`สแกนสำเร็จ: ${decodedText}`);
        stopCamera().then(() => {
          onScanSuccess(decodedText);
        });
      };

      const config = {
        fps: 15,
        qrbox: (width: number, height: number) => {
          const size = Math.min(width, height) * 0.7;
          return { width: size, height: size * 0.6 };
        },
        aspectRatio: 1.0,
      };

      await html5QrCodeRef.current.start(
        deviceId,
        config,
        handleSuccess,
        () => {}
      );
      setLoading(false);
    } catch (err: any) {
      console.error('Error changing camera:', err);
      setErrorMsg(err.message || 'เปลี่ยนกล้องไม่สำเร็จ');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      {/* Laser line animation style */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0%, 100% { top: 10%; opacity: 0.8; }
          50% { top: 90%; opacity: 1; }
        }
        .laser-line {
          position: absolute;
          left: 5%;
          right: 5%;
          height: 3px;
          background: linear-gradient(to right, transparent, #10b981, transparent);
          box-shadow: 0 0 10px #10b981, 0 0 20px #10b981;
          animation: scan 2.5s infinite ease-in-out;
          pointer-events: none;
          z-index: 10;
        }
      `}} />

      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden relative shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">สแกนบาร์โค้ด / QR Code</h3>
          </div>
          <button 
            onClick={handleClose}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="relative aspect-square w-full bg-black flex items-center justify-center overflow-hidden">
          {/* HTML5 QR Code Mount point */}
          <div id={scannerContainerId} className="w-full h-full object-cover"></div>

          {/* Loader or Error states overlay */}
          {(loading || errorMsg) && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center z-20">
              {loading && !errorMsg ? (
                <>
                  <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
                  <p className="text-sm font-semibold text-slate-300">กำลังเปิดใช้งานกล้อง...</p>
                  <p className="text-xs text-slate-500 mt-2">กรุณากด &quot;อนุญาต&quot; หากมีป๊อปอัปขอสิทธิ์กล้องถ่ายรูป</p>
                </>
              ) : (
                <>
                  <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
                  <p className="text-sm font-bold text-rose-400">{errorMsg}</p>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    โปรดตรวจสอบว่ากล้องไม่ถูกเรียกใช้โดยแอปอื่น และอุปกรณ์รองรับการใช้งานกล้องบนเบราว์เซอร์นี้
                  </p>
                  <button
                    onClick={() => {
                      setLoading(true);
                      setErrorMsg('');
                      // Force restart logic (caller can toggle modal or we can trigger self-cleanup)
                      stopCamera().then(() => {
                        // Tiny timeout and try to re-init
                        setTimeout(() => {
                          const container = document.getElementById(scannerContainerId);
                          if (container) {
                            // trigger mount logic again
                            window.location.reload();
                          }
                        }, 50);
                      });
                    }}
                    className="mt-6 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    ลองอีกครั้ง
                  </button>
                </>
              )}
            </div>
          )}

          {/* Target Reticle Overlay */}
          {!loading && !errorMsg && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
              {/* Outer darkened overlay border */}
              <div className="absolute inset-0 border-[40px] border-black/40"></div>
              
              {/* Inner target box */}
              <div className="relative w-[70%] h-[42%] border-2 border-emerald-500/80 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.15)] flex items-center justify-center">
                {/* Laser animation */}
                <div className="laser-line"></div>

                {/* Corner Accents */}
                <div className="absolute -top-1.5 -left-1.5 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-md"></div>
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-md"></div>
                <div className="absolute -bottom-1.5 -left-1.5 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-md"></div>
                <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-md"></div>

                {/* Subtitle helper */}
                <span className="absolute bottom-4 text-[10px] font-bold text-emerald-400 tracking-wider bg-slate-950/80 px-2.5 py-1 rounded-full uppercase">
                  ทาบแถบบาร์โค้ดในกรอบ
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">
            ส่องที่ตัวยากล่องหรือแผงยาเพื่ออ่านข้อมูล
          </p>

          {/* Camera switcher dropdown if multiple cameras exist */}
          {cameras.length > 1 && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <RefreshCw className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={activeCameraId}
                onChange={handleCameraChange}
                className="w-full sm:w-48 bg-slate-900 border border-slate-800 text-[11px] rounded-xl px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- สลับกล้อง --</option>
                {cameras.map(cam => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
