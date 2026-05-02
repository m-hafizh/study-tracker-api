FROM node:20-alpine

WORKDIR /app

# Use Corepack for a pinned pnpm workflow.
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

EXPOSE 3000

CMD ["sh", "-c", "pnpm prisma:generate && pnpm prisma:push && pnpm start"]
