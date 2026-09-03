ARG SPACETIMEDB_VERSION=v2.8.2

FROM node:22-alpine AS backend-dependencies

WORKDIR /workspace/spacetimedb
COPY spacetimedb/package.json spacetimedb/package-lock.json ./
RUN npm ci

FROM clockworklabs/spacetime:${SPACETIMEDB_VERSION}

USER root
WORKDIR /workspace

COPY --chown=spacetime:spacetime spacetimedb ./spacetimedb
COPY --chown=spacetime:spacetime --from=backend-dependencies /workspace/spacetimedb/node_modules ./spacetimedb/node_modules
COPY docker/publish-spacetimedb.sh /usr/local/bin/publish-spacetimedb

RUN chmod 755 /usr/local/bin/publish-spacetimedb \
  && mkdir -p /spacetime-cli \
  && chown spacetime:spacetime /spacetime-cli

USER spacetime

ENTRYPOINT ["/usr/local/bin/publish-spacetimedb"]
