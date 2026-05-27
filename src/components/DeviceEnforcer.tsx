"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Laptop, Smartphone, Monitor, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

function generateFingerprint() {
  // Simple heuristic fingerprint for MVP. In production, use FingerprintJS.
  if (typeof window === "undefined") return "server";
  return btoa(`${navigator.userAgent}-${screen.width}x${screen.height}-${navigator.language}`);
}

export function DeviceEnforcer({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [showModal, setShowModal] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);
  const [maxDevices, setMaxDevices] = useState(1);
  const [loadingDevice, setLoadingDevice] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (status !== "authenticated") return;

    const checkDevice = async () => {
      try {
        const fp = generateFingerprint();
        const res = await fetch("/api/auth/device-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceFingerprint: fp, userAgent: navigator.userAgent }),
        });
        const data = await res.json();
        
        if (data.status === "limit_reached") {
          setDevices(data.devices);
          setMaxDevices(data.maxDevices);
          setShowModal(true);
        }
      } catch (error) {
        console.error("Failed to check device limits", error);
      }
    };

    checkDevice();
  }, [status]);

  const handleRemoveDevice = async (deviceId: string) => {
    setLoadingDevice(deviceId);
    try {
      const res = await fetch("/api/auth/device-remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      });
      if (res.ok) {
        // After removing a device, this device should now be able to register.
        window.location.reload(); 
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDevice(null);
    }
  };

  if (showModal) {
    return (
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-popover border shadow-xl rounded-xl w-full max-w-lg overflow-hidden">
          <div className="p-6 border-b text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Device Limit Reached</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Your plan allows a maximum of {maxDevices} device{maxDevices > 1 ? "s" : ""} playing or browsing at the same time.
              </p>
            </div>
          </div>
          <div className="p-0 bg-muted/30">
            <div className="px-6 py-4 border-b">
              <p className="text-sm font-medium">To continue on this device, remove one of the following active devices:</p>
            </div>
            <ul className="divide-y max-h-[300px] overflow-y-auto">
              {devices.map(device => {
                const isMobile = /Mobi|Android/i.test(device.userAgent || "");
                return (
                  <li key={device.id} className="p-4 px-6 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-background rounded-md border shadow-sm">
                        {isMobile ? <Smartphone size={20} className="text-muted-foreground" /> : <Monitor size={20} className="text-muted-foreground" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium line-clamp-1 break-all max-w-[200px]">{device.userAgent?.split(" ")[0] || "Unknown Browser"}</p>
                        <p className="text-xs text-muted-foreground">Active: {new Date(device.lastActive).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      disabled={loadingDevice === device.id}
                      onClick={() => handleRemoveDevice(device.id)}
                    >
                      {loadingDevice === device.id ? "Removing..." : "Remove"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="p-6 flex flex-col items-center gap-3 bg-popover">
            <Button variant="default" className="w-full font-semibold" onClick={() => router.push("/premium")}>
              Upgrade Plan for More Devices
            </Button>
            <Button variant="ghost" className="text-xs text-muted-foreground" onClick={() => router.push("/login")}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
