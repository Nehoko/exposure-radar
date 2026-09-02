FROM denoland/deno:2.9.6 AS build

WORKDIR /workspace

COPY deno.json deno.lock ./
COPY frontend ./frontend

ARG VITE_SPACETIMEDB_HOST=auto
ARG VITE_SPACETIMEDB_DB_NAME=exposure-radar

ENV VITE_SPACETIMEDB_HOST=${VITE_SPACETIMEDB_HOST}
ENV VITE_SPACETIMEDB_DB_NAME=${VITE_SPACETIMEDB_DB_NAME}

RUN deno task --cwd frontend build

FROM denoland/deno:2.9.6

WORKDIR /app

COPY --from=build --chown=deno:deno /workspace/frontend/_fresh ./_fresh

USER deno

EXPOSE 8000

CMD ["serve", "-A", "--host=0.0.0.0", "--port=8000", "_fresh/server.js"]
