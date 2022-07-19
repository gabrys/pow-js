FROM debian

RUN dpkg --add-architecture i386  && apt update && apt install -y wine32 wine64 && date=2022-07-15
RUN wineboot --init
