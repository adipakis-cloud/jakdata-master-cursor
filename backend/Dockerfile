FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDeps for ts-node)
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy source
COPY . .

EXPOSE 3001

CMD ["npx", "ts-node", "--transpile-only", "src/main.ts"]
