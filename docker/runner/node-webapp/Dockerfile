FROM node:22-bookworm

WORKDIR /opt/axiom

COPY package.json package-lock.json ./
RUN npm ci --omit=optional
RUN npm install -g @openai/codex@0.118.0

COPY bin ./bin
COPY src ./src
RUN npm link

ENV HOME=/home/node

RUN mkdir -p /workspace/source /workspace/generated /workspace/reports /home/node/.codex \
  && touch /home/node/.codex/auth.json /home/node/.codex/config.toml \
  && chown -R node:node /workspace /home/node

USER node
WORKDIR /workspace/source
