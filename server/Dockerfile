FROM node:18-slim

# Install OpenSSL (required for Prisma)
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 3333

CMD ["npm", "start"]
