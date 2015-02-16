#
# 
#

FROM    ubuntu:14.10

ENV     DEBIAN_FRONTEND noninteractive

# TODO: libtool and gawk are missing from fabfile.py
RUN     apt-get update && apt-get install -y \
            automake \
            bison \
            build-essential \
            flex \
            git \
            gperf \
            libssl-dev \
            libtool \
            gawk \
            wget

# Build virtuoso
RUN     mkdir /src
WORKDIR /src
RUN     wget https://github.com/openlink/virtuoso-opensource/archive/v7.2.0.1.tar.gz && \
            tar -xf v7.2.0.1.tar.gz

WORKDIR /src/virtuoso-opensource-7.2.0.1
RUN     ./autogen.sh && \
            ./configure --prefix /db && \
            make -j4 && \
            mkdir /db && \
            make install

ADD     virtuoso.ini /db/virtuoso.ini

CMD     /db/bin/virtuoso-t -f -c /db/virtuoso.ini
EXPOSE  8892 5132
