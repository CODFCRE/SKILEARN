FROM node:22-alpine

ENV NODE_ENV=production
ENV PORT=5000

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node src ./src

USER node

EXPOSE 5000

CMD ["node", "src/index.js"]