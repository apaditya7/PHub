import asyncio
import websockets
import json
import hid
import time
import sys

# Silence stdout/stderr if desired for "stealth" mode, 
# but for now we just print to console.

print("--- Hinge Bird Bridge (60Hz) ---")

class HingeSensor:
    def __init__(self):
        self.device = None
        self.last_angle = 0
        self.connect()

    def connect(self):
        try:
            target_path = None
            # Iterate all Apple devices to find Usage Page 32 (Sensors)
            for d in hid.enumerate(0x05AC):
                if d['usage_page'] == 32:
                    target_path = d['path']
                    break
            
            if target_path:
                print(f"Sensor Found: {target_path.decode()}")
                self.device = hid.device()
                self.device.open_path(target_path)
                self.device.set_nonblocking(1)
                return True
            else:
                return False
        except Exception as e:
            return False

    def get_angle(self):
        if not self.device:
            if not self.connect():
                return None
        try:
            # Feature Report ID 1, Length 3
            # Byte 0: Report ID
            # Byte 1: Angle (approx 0-180ish)
            # Byte 2: ?
            data = self.device.get_feature_report(1, 3)
            self.last_angle = float(data[1])
            return self.last_angle
        except Exception as e:
            self.device = None
            return self.last_angle

async def handler(websocket):
    print("Client Connected")
    sensor = HingeSensor()
    try:
        while True:
            angle = sensor.get_angle()
            if angle is not None:
                await websocket.send(json.dumps({
                    "type": "angle", 
                    "value": angle, 
                    "timestamp": time.time()
                }))
            # 60Hz update rate
            await asyncio.sleep(0.016) 
    except:
        print("Client Disconnected")

async def main():
    print("Bridge Running on ws://localhost:8765")
    # Bind to 0.0.0.0 to allow connections from local network if needed,
    # but 'localhost' is safer for local browser -> local bridge.
    # The CRITICAL part for a deployed frontend is CORS (Cross-Origin Resource Sharing).
    # Browsers often block ws://localhost from https://deployed-site.com.
    # However, for pure WebSocket (ws://), standard browsers usually allow
    # localhost connections even from HTTPS pages (Mixed Content exceptions exist for localhost).
    
    # We add origins=None to allow connections from ANY domain (your deployed site).
    async with websockets.serve(handler, "localhost", 8765, origins=None):
        await asyncio.get_running_loop().create_future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
