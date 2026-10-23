FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/backend/package.json packages/backend/package.json
RUN npm install --workspace=@e-patti/shared --workspace=@e-patti/backend

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY packages/shared packages/shared
COPY packages/backend packages/backend
RUN npm run build --workspace=@e-patti/shared
RUN npm run build --workspace=@e-patti/backend

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/packages/backend ./packages/backend
WORKDIR /app/packages/backend
RUN mkdir -p /data/users /data/games /data/backups /generated/pdf
ENV DATA_DIR=/data
ENV GENERATED_DIR=/generated
EXPOSE 4000
CMD ["node", "dist/index.js"]
