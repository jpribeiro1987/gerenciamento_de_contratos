# Guia de Instalação e Implantação Local

Este guia descreve os passos necessários para hospedar o **Sistema de Gestão de Contratos** em um servidor local da empresa utilizando o Docker.

## 1. Pré-requisitos do Servidor

O servidor onde a aplicação vai rodar precisa ter instalados:
- **Git** (Para baixar o código fonte)
- **Docker** (Motor dos contêineres)
- **Docker Compose** (Orquestrador)

*(Se for um servidor Windows, instale o **Docker Desktop**)*.

## 2. Passo a Passo de Implantação

**Passo 1: Baixar o projeto no Servidor**
Abra o terminal/prompt de comando do servidor e clone o repositório do Github:
```bash
git clone https://github.com/jpribeiro1987/gerenciamento_de_contratos.git
cd gerenciamento_de_contratos
```

**Passo 2: Construir e Iniciar os Contêineres**
Basta rodar o comando mágico do Docker Compose na raiz do projeto (onde está o arquivo `docker-compose.yml`):
```bash
docker compose up --build -d
```
*O que isso faz?* 
- `--build`: Vai baixar a linguagem Node, gerar a versão otimizada do React e preparar o ambiente isolado do Nginx.
- `-d`: Vai rodar o sistema em segundo plano de forma "desacoplada" do seu terminal.

**Passo 3: Acessar a Aplicação**
- Pelo próprio servidor: Abra o navegador e acesse `http://localhost`.
- Por outras máquinas na rede da empresa: Descubra o IP do servidor (usando `ipconfig` no Windows ou `ip a` no Linux) e acesse através do IP. Exemplo: `http://192.168.0.10`.

## 3. Manutenção e Persistência de Dados

O banco de dados SQLite (`dev.db`) e os PDFs (`/uploads`) foram configurados via "Volumes" no `docker-compose.yml`. Isso significa que todos os cadastros e anexos ficam salvos nas pastas normais (`/backend/prisma` e `/backend/uploads`) na máquina local.

Se você precisar reiniciar o servidor ou derrubar os contêineres (`docker compose down`), os dados **não** serão perdidos.

## 4. Atualizando o Sistema no Futuro

Se você subir alterações no Github e quiser puxar para o servidor:
```bash
# 1. Puxe as atualizações
git pull origin main

# 2. Recrie as imagens e suba os contêineres
docker compose up --build -d
```
