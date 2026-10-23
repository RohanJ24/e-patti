FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/web/package.json packages/web/package.json
RUN npm install --workspace=@e-patti/shared --workspace=@e-patti/web

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY packages/shared packages/shared
COPY packages/web packages/web
RUN npm run build --workspace=@e-patti/shared
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=@e-patti/web

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/packages/web/.next/standalone ./
COPY --from=build /app/packages/web/.next/static ./packages/web/.next/static
COPY --from=build /app/packages/web/public ./packages/web/public
EXPOSE 3000
ENV PORT=3000
CMD ["node", "packages/web/server.js"]
