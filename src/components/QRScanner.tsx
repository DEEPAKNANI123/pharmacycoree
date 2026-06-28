import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    let html5QrcodeScanner: Html5QrcodeScanner | null = null;

    // Use a slight timeout to bypass React 18 strict mode's double-mount issue
    // The first mount's timeout will be cleared immediately by the strict mode unmount.
    const timeoutId = setTimeout(() => {
      html5QrcodeScanner = new Html5QrcodeScanner(
        'qr-reader',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      html5QrcodeScanner.render(
        (decodedText) => {
          if (html5QrcodeScanner) {
            html5QrcodeScanner.clear();
          }
          onScan(decodedText);
        },
        (error) => {
          // Ignore errors
        }
      );
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(error => {
          console.error("Failed to clear html5QrcodeScanner. ", error);
        });
      }
    };
  }, [onScan]);

  return (
    <div className="qr-scanner-overlay">
      <div className="qr-scanner-modal">
        <div className="qr-scanner-header">
          <h3>Scan QR Code</h3>
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
        <div id="qr-reader" style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}></div>
      </div>
    </div>
  );
}
