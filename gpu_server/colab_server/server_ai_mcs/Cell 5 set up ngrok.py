# @title 5. cấu hình ngrok
import base64
import uuid
import os
import json
import asyncio
import subprocess
import threading
import time
import socket
from io import BytesIO
from typing import List, Optional

USE_NGROK = True
def pick_free_port(preferred: int = 8000) -> int:
    for p in [preferred] + list(range(preferred + 1, preferred + 50)):
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            s.bind(("0.0.0.0", p))
            s.close()
            return p
        except OSError:
            s.close()
            continue
    return preferred
PORT = pick_free_port(8000)
NGROK_AUTH_TOKEN = None
if USE_NGROK:
    NGROK_AUTH_TOKEN = os.environ.get("NGROK_AUTH_TOKEN") or os.environ.get("NGROK_TOKEN")
    if not NGROK_AUTH_TOKEN:
        try:
            from getpass import getpass
            NGROK_AUTH_TOKEN = getpass("Nhập NGROK_AUTH_TOKEN: ")
            if NGROK_AUTH_TOKEN:
                os.environ["NGROK_AUTH_TOKEN"] = NGROK_AUTH_TOKEN
        except Exception:
            NGROK_AUTH_TOKEN = None
