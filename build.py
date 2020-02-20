import sys
import os

if "css" in sys.argv:
    os.system("py css/build_css.py")

if "html" in sys.argv:
    os.chdir(".pygen")
    os.system("py generate.py")