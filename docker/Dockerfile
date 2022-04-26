FROM debian

RUN apt update && apt install -y build-essential git zip && date=2022-04-23

WORKDIR /build/
RUN git clone https://github.com/jart/cosmopolitan && cd cosmopolitan && git reset --hard 552525cbdd682f9e6e7d504ef62d0e1b0db3a2b8
RUN cd cosmopolitan && make -j8 o//third_party/quickjs/qjs.com
RUN cp cosmopolitan/o/third_party/quickjs/qjs.com qjs.com

ADD qjs.diff .
RUN patch cosmopolitan/third_party/quickjs/qjs.c qjs.diff
RUN cd cosmopolitan && make -j8 o//third_party/quickjs/qjs.com
RUN cp cosmopolitan/o/third_party/quickjs/qjs.com pow_runner.com

ADD build-pow /bin/

WORKDIR /
