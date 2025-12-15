
import sys
import subprocess
import importlib.util

def install_libcst():
    if importlib.util.find_spec("libcst") is None:
        print("LibCST not found. Installing...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "libcst"])
    else:
        print("LibCST is already installed.")

if __name__ == "__main__":
    install_libcst()
