import socket
import struct
import threading

import cv2
import numpy as np


class NetworkCameraReceiver:
    def __init__(self, port, host="0.0.0.0"):
        self.port = port
        self.host = host

        self._latest_frame = None
        self._lock = threading.Lock()
        self._running = True
        self._connected = False

        self._server_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._server_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self._server_sock.bind((self.host, self.port))
        self._server_sock.listen(1)

        print(f"[NET-CAM] Menunggu Raspberry Pi connect di port {self.port} ...")

        self._thread = threading.Thread(target=self._accept_loop, daemon=True)
        self._thread.start()

    def isOpened(self):
        return self._running

    def read(self):
        with self._lock:
            if self._latest_frame is None:
                return False, None
            return True, self._latest_frame.copy()

    def release(self):
        self._running = False
        try:
            self._server_sock.close()
        except Exception:
            pass

    def _accept_loop(self):
        while self._running:
            try:
                conn, addr = self._server_sock.accept()
            except OSError:
                break
            print(f"[NET-CAM] Raspberry Pi terhubung dari {addr}")
            self._connected = True
            self._receive_loop(conn)
            self._connected = False
            print("[NET-CAM] Koneksi Raspberry Pi terputus, menunggu koneksi baru ...")

    def _receive_loop(self, conn):
        conn.settimeout(5.0)
        try:
            while self._running:
                header = self._recv_exact(conn, 4)
                if header is None:
                    break
                (length,) = struct.unpack(">L", header)

                payload = self._recv_exact(conn, length)
                if payload is None:
                    break

                frame = cv2.imdecode(
                    np.frombuffer(payload, dtype=np.uint8), cv2.IMREAD_COLOR
                )
                if frame is None:
                    continue

                with self._lock:
                    self._latest_frame = frame

        except (ConnectionResetError, socket.timeout, OSError):
            pass
        finally:
            try:
                conn.close()
            except Exception:
                pass

    @staticmethod
    def _recv_exact(conn, size):
        buf = b""
        while len(buf) < size:
            chunk = conn.recv(size - len(buf))
            if not chunk:
                return None
            buf += chunk
        return buf