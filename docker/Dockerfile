FROM debian:bullseye

# General cache buster:

RUN true 2022-07-21

# System packages:

RUN apt-get update && apt-get install -y build-essential cmake gcc-mingw-w64-x86-64 git zip

WORKDIR /build/

# Fetch upstream project sources:

RUN git clone https://github.com/jart/cosmopolitan.git cosmopolitan \
    && cd cosmopolitan && git reset --hard 4700984456b17169730414fbba24235cc3aad504

RUN mkdir windows && git clone https://github.com/bellard/quickjs.git windows/quickjs \
    && cd windows/quickjs && git reset --hard b5e62895c619d4ffc75c9d822c8d85f1ece77e5b

RUN git clone https://github.com/DaanDeMeyer/reproc.git windows/reproc \
    && cd windows/reproc && git reset --hard 08675b1b1f1317afa4c8b39fa3a180e7b7ec4ced

# Build deps:

ADD build-reproc-mingw /bin/
RUN build-reproc-mingw

# Build base Cosmo and MinGW versions of QuickJS (without our modifications):

ADD build-qjs-cosmo /bin/
RUN build-qjs-cosmo /build/qjs.com

ADD build-qjs-mingw /bin/
RUN build-qjs-mingw /build/qjs.exe

# Apply our changes:

ADD patch-qjs /bin/
ADD qjs_pow.c .
RUN patch-qjs qjs_pow.c

# Build the patched versions of QuickJS:

RUN build-qjs-cosmo /build/pow_runner.com
RUN build-qjs-mingw /build/pow.exe

# Embed a script to build the distributable version:

ADD build-pow /bin/

WORKDIR /

# Fin.
