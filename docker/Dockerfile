FROM debian

RUN apt update && apt install -y build-essential git zip && date=2022-04-23

WORKDIR /build/
RUN git clone https://github.com/jart/cosmopolitan && cd cosmopolitan && git reset --hard 0a589add4167c1b5873eddd2904569e90bf4f27c
ADD build-qjs /bin/
RUN build-qjs /build/qjs.com

ADD qjs_pow.c .
RUN sed 's/^int main(/int orig_main(/' -i cosmopolitan/third_party/quickjs/qjs.c \
    && cat qjs_pow.c >> cosmopolitan/third_party/quickjs/qjs.c

RUN build-qjs /build/pow_runner.com

ADD build-pow /bin/

WORKDIR /
