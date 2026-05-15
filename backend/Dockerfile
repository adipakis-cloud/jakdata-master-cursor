FROM node:20-alpine

# Install OpenSSL untuk Prisma
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install
RUN npx prisma generate

COPY . .

EXPOSE 3001

CMD ["npx", "ts-node", "--transpile-only", "src/main.ts"]
