FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm config set fetch-retries 10 \
	&& pnpm config set fetch-retry-mintimeout 10000 \
	&& pnpm config set fetch-retry-maxtimeout 120000 \
	&& pnpm install --frozen-lockfile

FROM deps AS build
WORKDIR /app

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

RUN pnpm prisma:generate && pnpm build && pnpm prune --prod

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./package.json

EXPOSE 3000

CMD ["node", "dist/src/index.js"]
