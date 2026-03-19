FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS client-build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN cd client && npm ci
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
COPY --from=client-build /app/client/build ./client/build

EXPOSE 5000
CMD ["node", "server/index.js"]
