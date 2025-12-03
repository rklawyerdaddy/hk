FROM node:18-alpine

# Instalar dependências do sistema necessárias para o Prisma (OpenSSL)
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

# Gerar o cliente Prisma
RUN npx prisma generate

EXPOSE 3333

CMD ["npm", "start"]
