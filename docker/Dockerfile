FROM debian

RUN true date=2022-07-15
RUN apt-get update && apt-get install -y build-essential gcc-mingw-w64-x86-64 git zip

WORKDIR /build/

RUN git clone https://github.com/jart/cosmopolitan.git cosmopolitan \
    && cd cosmopolitan && git reset --hard 4700984456b17169730414fbba24235cc3aad504

RUN mkdir windows && git clone https://github.com/bellard/quickjs.git windows/quickjs \
    && cd windows/quickjs && git reset --hard b5e62895c619d4ffc75c9d822c8d85f1ece77e5b

ADD build-qjs /bin/
RUN build-qjs cosmo /build/qjs.com
RUN build-qjs win /build/qjs.exe

ADD patch-qjs /bin/
ADD qjs_pow.c .
RUN patch-qjs qjs_pow.c

RUN build-qjs cosmo /build/pow_runner.com
RUN build-qjs win /build/pow.exe

ADD build-pow /bin/

WORKDIR /
