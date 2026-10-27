FROM python:3.11-slim

# Create non-privileged user
RUN groupadd -r scanner && useradd -r -g scanner -u 10001 scanner

WORKDIR /app

# Copy dependency definition
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY ssrf_guard.py inspector.py ./

# Set permissions
RUN chown -R scanner:scanner /app

USER 10001:10001

ENTRYPOINT ["python", "inspector.py"]
