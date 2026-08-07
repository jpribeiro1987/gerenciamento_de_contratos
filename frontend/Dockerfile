# Estágio 1: Build
FROM node:22-alpine AS build

WORKDIR /app

# Copiar os arquivos de pacote e instalar dependências
COPY package*.json ./
RUN npm install

# Copiar o resto dos arquivos do frontend e gerar o build estático
COPY . .
RUN npm run build

# Estágio 2: Serve
FROM nginx:alpine

# Copiar os arquivos compilados do React
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar o arquivo de configuração customizado do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
