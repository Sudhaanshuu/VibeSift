FROM zaproxy/zap-stable:2.15.0

USER root
WORKDIR /app

COPY zap_runner.py /app/zap_runner.py
RUN chmod +x /app/zap_runner.py

USER zap
ENTRYPOINT ["python3", "/app/zap_runner.py"]
