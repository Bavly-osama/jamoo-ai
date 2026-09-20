FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run assets && npm run build
ENV NODE_ENV=production PORT=4317
EXPOSE 4317
USER node
CMD ["npm", "start"]
