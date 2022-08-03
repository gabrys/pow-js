# We need MinGW version 9 (GCC 11) which isn't available in Debian yet

FROM archlinux

# General cache buster:

RUN true 2022-07-29

# Install system packages:

RUN pacman --noconfirm -Sy gcc git make mingw-w64-gcc wget which zip

WORKDIR /build/

# Build and install Boost:

ADD install-boost-mingw /bin/
RUN install-boost-mingw

# Fetch upstream project sources:

RUN git clone https://github.com/jart/cosmopolitan.git cosmopolitan \
    && cd cosmopolitan && git reset --hard 4700984456b17169730414fbba24235cc3aad504

RUN git clone https://github.com/bellard/quickjs.git windows/quickjs \
    && cd windows/quickjs && git reset --hard b5e62895c619d4ffc75c9d822c8d85f1ece77e5b

# Build base Cosmo and MinGW versions of QuickJS (without our modifications):

ADD build-qjs-cosmo /bin/
RUN build-qjs-cosmo /build/qjs.com

ADD build-qjs-mingw /bin/
RUN build-qjs-mingw /build/qjs.exe

# Libbspawn
# todo: use git, move next to boost
ADD libbspawn/ windows/libbspawn
ADD install-libbspawn-mingw /bin/
RUN install-libbspawn-mingw

# Apply our changes:

RUN build-qjs-cosmo /build/pow_runner.com
RUN build-qjs-mingw /build/pow.exe

ADD patch-qjs /bin/
ADD qjs_pow.c .
RUN patch-qjs qjs_pow.c

# Build the patched versions of QuickJS:

RUN build-qjs-cosmo /build/pow_runner.com
RUN build-qjs-mingw /build/pow.exe

# Embed a script to build the distributable version:

ADD build-pow /bin/

WORKDIR /

# # Fin.
