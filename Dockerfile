FROM oven/bun:1.3.14-slim AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1.3.14-slim
WORKDIR /app
COPY --from=build --chown=bun:bun /app/server ./server
COPY --from=build --chown=bun:bun /app/fixtures ./fixtures
COPY --from=build --chown=bun:bun /app/site-dist ./site-dist
USER bun
ENV PORT=3000
EXPOSE 3000
CMD ["bun", "run", "server/index.ts"]
