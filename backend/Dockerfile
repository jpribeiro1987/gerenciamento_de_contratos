FROM node:22-alpine

WORKDIR /app

# Instalar pacotes de sistema necessários (openssl para Prisma e tzdata para fuso horário)
RUN apk add --no-cache openssl tzdata

# Copiar apenas os arquivos de dependência primeiro (para usar cache do Docker)
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependências
RUN npm install

# Copiar o restante do código fonte
COPY . .

# Gerar o cliente do Prisma e rodar as migrações/push pro sqlite
RUN npx prisma generate

EXPOSE 3000

# Script de entrada para garantir que o banco está sincronizado antes de iniciar
CMD ["sh", "-c", "npx prisma db push && node seed.js && node src/app.js"]
