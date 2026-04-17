FROM node:22-bookworm

WORKDIR /opt/axiom

COPY package.json package-lock.json ./
RUN npm ci --omit=optional

COPY bin ./bin
COPY src ./src
RUN npm link

RUN mkdir -p /workspace/source /workspace/generated /workspace/reports

WORKDIR /workspace/source
