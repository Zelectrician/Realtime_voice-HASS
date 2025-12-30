ARG BUILD_ARCH
FROM ghcr.io/home-assistant/${BUILD_ARCH}-base-python:3.12-alpine3.23

WORKDIR /opt/app

COPY requirements.txt /opt/app/requirements.txt
RUN pip install --no-cache-dir -r /opt/app/requirements.txt

COPY app /opt/app/app
COPY run.sh /run.sh
RUN chmod a+x /run.sh

EXPOSE 8099
CMD [ "/run.sh" ]
