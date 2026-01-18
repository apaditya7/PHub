// @ts-nocheck
import { useState, useRef, useCallback } from 'react';

// Constants
const SENSOR_USAGE_PAGE = 0x0020;
const VENDOR_ID = 0x05AC;

const BRIDGE_SCRIPT_PY = `
import asyncio
import websockets
import json
import hid
import time

print("--- Hinge Bird Bridge ---")
print("1. Installing dependencies (if needed)...")
# Note: In a real standalone app, dependencies would be bundled.
# For this script, we assume the user has 'hid' and 'websockets' or we could auto-install.

class HingeSensor:
    def __init__(self):
        self.device = None
        self.last_angle = 0
        self.connect()

    def connect(self):
        try:
            target_path = None
            for d in hid.enumerate(0x05AC):
                if d['usage_page'] == 32:
                    target_path = d['path']
                    break
            
            if target_path:
                print(f"Sensor Connected: {target_path.decode()}")
                self.device = hid.device()
                self.device.open_path(target_path)
                self.device.set_nonblocking(1)
                return True
            else:
                print("Searching for sensor...")
                return False
        except Exception as e:
            # print(f"Connection Error: {e}")
            return False

    def get_angle(self):
        if not self.device:
            if not self.connect():
                return None
        try:
            data = self.device.get_feature_report(1, 3)
            self.last_angle = float(data[1])
            return self.last_angle
        except Exception as e:
            self.device = None
            return self.last_angle

async def handler(websocket):
    print("Game Client Connected!")
    sensor = HingeSensor()
    try:
        while True:
            angle = sensor.get_angle()
            if angle is not None:
                await websocket.send(json.dumps({
                    "type": "angle", "value": angle, "timestamp": time.time()
                }))
            await asyncio.sleep(0.016) 
    except:
        print("Game Client Disconnected")

async def main():
    print("\\nREADY! Go back to the browser and click 'Connect (Bridge)'")
    print("Listening on ws://localhost:8765...")
    async with websockets.serve(handler, "localhost", 8765):
        await asyncio.get_running_loop().create_future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
`;

export function useHingeSensor() {
    const [angle, setAngle] = useState(0);
    const [hz, setHz] = useState(0);
    const angleRef = useRef(0); 
    const [isConnected, setIsConnected] = useState(false);
    const [connectionMode, setConnectionMode] = useState(null); // 'hid' or 'bridge'
    const [error, setError] = useState(null);
    const [debugInfo, setDebugInfo] = useState(""); 
    const [deviceInfo, setDeviceInfo] = useState(null);
    
    // WebHID Refs
    const deviceRef = useRef(null);
    const isPollingRef = useRef(false);

    // Common Refs
    const lastUpdateRef = useRef(0);
    const frameCountRef = useRef(0);
    const lastHzTimeRef = useRef(Date.now());

    // Helper: Update Logic
    const updateAngle = (newAngle) => {
        if (newAngle > 0) {
            angleRef.current = newAngle;
            
            // Hz Counter
            frameCountRef.current++; 
            const now = Date.now();
            if (now - lastHzTimeRef.current > 1000) {
                setHz(frameCountRef.current);
                frameCountRef.current = 0;
                lastHzTimeRef.current = now;
            }

            // React State Update (throttled to 60fps)
            if (now - lastUpdateRef.current > 16) { 
                setAngle(newAngle);
                lastUpdateRef.current = now;
            }
        }
    };

    // --- Mode 1: WebSocket Bridge (60Hz Guaranteed) ---
    const connectBridge = useCallback(() => {
        setError(null);
        setDebugInfo("Connecting to Bridge...");
        
        try {
            const ws = new WebSocket('ws://localhost:8765');
            
            ws.onopen = () => {
                setIsConnected(true);
                setConnectionMode('bridge');
                setDeviceInfo("Local Python Bridge (60Hz)");
                setDebugInfo("Connected via WebSocket");
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'angle') {
                        updateAngle(data.value);
                    }
                } catch (e) {}
            };

            ws.onerror = (e) => {
                setError("Bridge not found. Did you run the script?");
                setIsConnected(false);
            };

            ws.onclose = () => {
                setIsConnected(false);
                setConnectionMode(null);
            };

        } catch (e) {
            setError(e.message);
        }
    }, []);

    const downloadBridgeScript = () => {
        if (typeof window === 'undefined') return;
        
        const blob = new Blob([BRIDGE_SCRIPT_PY], { type: 'text/x-python' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'hinge_bridge.py';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // --- Mode 2: WebHID (Native Browser) ---
    const connectHID = async () => {
        if (typeof navigator === 'undefined' || !navigator.hid) {
            setError("WebHID not supported in this browser.");
            return;
        }

        try {
            setError(null);
            const devices = await navigator.hid.requestDevice({
                filters: [{ 
                    vendorId: VENDOR_ID,
                    usagePage: SENSOR_USAGE_PAGE
                }]
            });

            if (devices.length === 0) return;

            const device = devices[0]; 
            
            // Debug Info
            const collections = device.collections.map(c => `Usage: ${c.usagePage}`).join(', ');
            setDeviceInfo(`${device.productName} (WebHID)`);

            await device.open();
            deviceRef.current = device;
            setIsConnected(true);
            setConnectionMode('hid');

            // 1. Listen for Input Reports (Standard Mode)
            device.addEventListener('inputreport', (event) => {
                const { data } = event;
                const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
                
                let newAngle = 0;
                if (bytes.length > 0) {
                    if (bytes[0] > 0 && bytes[0] <= 180) newAngle = bytes[0];
                    else if (bytes.length > 1 && bytes[1] > 0 && bytes[1] <= 180) newAngle = bytes[1];
                }
                
                updateAngle(newAngle);
            });

            // 2. Try Polling (Might be blocked)
            const pollSensor = async () => {
                if (!deviceRef.current || !deviceRef.current.opened || !isPollingRef.current) return;
                
                try {
                    const data = await deviceRef.current.receiveFeatureReport(1);
                    const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
                    
                    let newAngle = 0;
                    if (bytes.length > 0) {
                         if (bytes[0] > 0 && bytes[0] <= 180) newAngle = bytes[0];
                         else if (bytes.length > 1 && bytes[1] > 0 && bytes[1] <= 180) newAngle = bytes[1];
                    }

                    updateAngle(newAngle);
                    
                    // If success, keep polling
                    requestAnimationFrame(pollSensor);

                } catch (e) {
                    // If blocked, STOP polling permanently
                    console.log("Polling Blocked. Switching to Standard Mode.");
                    setDebugInfo("Standard Mode (2Hz) - Browser Blocked High Speed");
                    isPollingRef.current = false;
                }
            };
            
            // Start polling attempt
            isPollingRef.current = true;
            pollSensor();

        } catch (err) {
            console.error(err);
            setError(err.message);
            setIsConnected(false);
            isPollingRef.current = false;
        }
    };

    return { angle, angleRef, hz, isConnected, connectionMode, connectHID, connectBridge, downloadBridgeScript, error, deviceInfo, debugInfo };
}
