
FROM node:20-bookworm-slim

# Create a CA bundle from Node's trusted root certificates so APT
# can verify HTTPS connections to Debian repositories.
RUN mkdir -p /etc/ssl/certs \
    && node -e "require('fs').writeFileSync('/etc/ssl/certs/ca-certificates.crt', require('tls').rootCertificates.join('\n') + '\n')" \
    && sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        chromium \
        fonts-liberation \
        fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

ENV CHROME_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

COPY package.json .
RUN npm install --omit=dev

COPY runner.js .
RUN chmod +x runner.js

# Run as a non-root user
RUN groupadd -r lighthouse \
    && useradd -r -g lighthouse -u 10002 lighthouse \
    && chown -R lighthouse:lighthouse /app

USER 10002:10002

ENTRYPOINT ["node", "runner.js"]
