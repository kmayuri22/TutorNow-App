import socket
import time
import sys

def wait_for_ports(ports, host="127.0.0.1", timeout=60):
    start_time = time.time()
    for port in ports:
        print(f"Waiting for {host}:{port} to be responsive...")
        port_open = False
        while time.time() - start_time < timeout:
            try:
                # Attempt to connect to the port
                with socket.create_connection((host, port), timeout=1.0):
                    print(f"Success! {host}:{port} is responsive.")
                    port_open = True
                    break
            except (ConnectionRefusedError, socket.timeout, OSError):
                time.sleep(1.0)
        
        if not port_open:
            print(f"ERROR: Timeout of {timeout}s reached waiting for {host}:{port}")
            return False
    return True

if __name__ == "__main__":
    # Wait for backend (8000) and frontend (3000)
    success = wait_for_ports([8000, 3000], timeout=60)
    sys.exit(0 if success else 1)
