FROM debian

RUN true date=2022-08-06
RUN apt-get update && apt-get install -y build-essential file git zip

WORKDIR /build/

RUN git clone https://github.com/jart/cosmopolitan.git cosmopolitan \
    && cd cosmopolitan && git reset --hard af3df0893bd39c6f9d8d6bfa519fed51330c9123

ADD patch-qjs /bin/
ADD qjs_pow.c .
RUN patch-qjs qjs_pow.c

ADD demzify /bin/
ADD build-qjs /bin/
RUN build-qjs linux-macos /build/pow-runner.sh
RUN build-qjs windows /build/pow-runner.exe

ADD build-assimilate /bin/
RUN build-assimilate

ADD build-pow /bin/
