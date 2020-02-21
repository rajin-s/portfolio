import sys
import os

if "css" in sys.argv:
    os.chdir("css")
    os.system("py build_css.py")
    os.chdir("..")

if "html" in sys.argv:
    os.chdir(".pygen")
    os.system("py generate.py")
    os.chdir("..")