ARG BUILD_FROM
FROM $BUILD_FROM

# Install python + deps (Alpine base; BUILD_FROM provided by Supervisor)
RUN apk add --no-cache python3 py3-pip

WORKDIR /opt/app

COPY requirements.txt /opt/app/requirements.txt
RUN pip3 install --no-cache-dir -r /opt/app/requirements.txt

COPY app /opt/app/app
COPY run.sh /run.sh
RUN chmod a+x /run.sh

EXPOSE 8099

CMD [ "/run.sh" ]
