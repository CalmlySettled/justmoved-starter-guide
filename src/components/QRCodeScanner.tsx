import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, X, KeyRound } from "lucide-react";

interface QRCodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScanSuccess: (propertyToken: string) => void;
}

export function QRCodeScanner({ open, onClose, onScanSuccess }: QRCodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = "qr-reader";

  useEffect(() => {
    if (open && !showManualInput) {
      startScanning();
    }

    return () => {
      stopScanning();
    };
  }, [open, showManualInput]);

  const startScanning = async () => {
    try {
      setScanning(true);
      const html5QrCode = new Html5Qrcode(scannerDivId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Extract property token from URL or use as-is
          const url = new URL(decodedText);
          const token = url.searchParams.get("property") || decodedText;
          
          stopScanning();
          onScanSuccess(token);
        },
        () => {
          // Ignore scan errors (they happen frequently)
        }
      );
    } catch (error) {
      console.error("Camera access error:", error);
      setShowManualInput(true);
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .then(() => {
          scannerRef.current = null;
          setScanning(false);
        })
        .catch((err) => {
          console.error("Error stopping scanner:", err);
        });
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualToken.trim()) {
      onScanSuccess(manualToken.trim());
    }
  };

  const handleClose = () => {
    stopScanning();
    setShowManualInput(false);
    setManualToken("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan Property QR Code
          </DialogTitle>
          <DialogDescription>
            Point your camera at the QR code provided by your property manager
          </DialogDescription>
        </DialogHeader>

        {!showManualInput ? (
          <div className="space-y-4">
            <div 
              id={scannerDivId} 
              className="w-full rounded-lg overflow-hidden border border-border"
            />
            
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  stopScanning();
                  setShowManualInput(true);
                }}
                className="w-full"
              >
                <KeyRound className="h-4 w-4 mr-2" />
                Enter Code Manually
              </Button>
              
              <Button
                variant="ghost"
                onClick={handleClose}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="manual-token">Property Code</Label>
              <Input
                id="manual-token"
                placeholder="Enter your property code"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Find this code in the email or message from your property manager
              </p>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button type="submit" className="w-full">
                Continue
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowManualInput(false);
                  setManualToken("");
                }}
                className="w-full"
              >
                <Camera className="h-4 w-4 mr-2" />
                Use Camera Instead
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
