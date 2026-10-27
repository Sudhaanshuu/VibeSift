FROM projectdiscovery/nuclei:v3.3.7

USER root
RUN apk add --no-cache python3 py3-pip

WORKDIR /app
COPY nuclei_runner.py /app/nuclei_runner.py
RUN chmod +x /app/nuclei_runner.py

# Run as non-root user
USER 10001:10001

ENTRYPOINT ["python3", "/app/nuclei_runner.py"]
