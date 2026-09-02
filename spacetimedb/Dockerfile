ARG SPACETIMEDB_VERSION=v2.8.2
FROM clockworklabs/spacetime:${SPACETIMEDB_VERSION}

USER root
WORKDIR /workspace

COPY spacetimedb ./spacetimedb
COPY docker/publish-spacetimedb.sh /usr/local/bin/publish-spacetimedb

RUN chmod 755 /usr/local/bin/publish-spacetimedb \
  && mkdir -p /spacetime-cli \
  && chown spacetime:spacetime /spacetime-cli

USER spacetime

ENTRYPOINT ["/usr/local/bin/publish-spacetimedb"]
