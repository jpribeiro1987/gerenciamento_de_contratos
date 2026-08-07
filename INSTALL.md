# Guia de Instalação e Implantação Local (Ubuntu Server)

Este guia descreve os passos necessários para hospedar o **Sistema de Gestão de Contratos** em um servidor Linux (Ubuntu/Debian) utilizando o Docker.

## 1. Instalando as Dependências (Docker e Git)

Acesse o terminal do seu servidor Ubuntu (via SSH) e execute os comandos abaixo para garantir que o sistema está atualizado e instalar o Git, Docker e o Docker Compose.

**Passo 1.1: Atualizar pacotes e instalar o Git**
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl
```

**Passo 1.2: Instalar o Docker**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

**Passo 1.3: Adicionar seu usuário ao grupo do Docker (Opcional, mas recomendado)**
Para rodar comandos docker sem precisar digitar `sudo` toda vez:
```bash
sudo usermod -aG docker $USER
```
*(Após rodar esse comando, você precisará sair da sessão SSH e entrar novamente para ter efeito, ou rodar `newgrp docker`)*.

**Passo 1.4: Instalar o Docker Compose**
```bash
sudo apt install -y docker-compose-plugin
```
Para garantir que está tudo certo, rode: `docker compose version`. Se a versão aparecer na tela, você está pronto!

---

## 2. Passo a Passo de Implantação

**Passo 2.1: Baixar o projeto no Servidor**
Vá para a pasta onde deseja salvar a aplicação (ex: `/var/www` ou `/opt`) e clone o repositório do Github:
```bash
cd /opt
sudo git clone https://github.com/jpribeiro1987/gerenciamento_de_contratos.git
cd gerenciamento_de_contratos
```

**Passo 2.2: Construir e Iniciar os Contêineres**
Rode o comando mágico do Docker Compose na raiz do projeto (onde está o arquivo `docker-compose.yml`):
```bash
sudo docker compose up --build -d
```
*O que isso faz?* 
- `--build`: Vai baixar a linguagem Node, gerar a versão otimizada do React e preparar o ambiente isolado do Nginx.
- `-d`: Vai rodar o sistema em segundo plano de forma "desacoplada" do seu terminal.

**Passo 2.3: Liberar o Firewall (Caso esteja ativo)**
Se o Ubuntu estiver rodando o firewall padrão (UFW), libere a porta 80 para permitir que a rede acesse o sistema:
```bash
sudo ufw allow 80/tcp
```

**Passo 2.4: Acessar a Aplicação**
- Na rede da sua empresa, descubra o IP local do servidor Ubuntu usando o comando:
```bash
ip a
```
- Digite esse endereço de IP no navegador de outra máquina. Exemplo: `http://192.168.0.50`

---

## 3. Manutenção e Persistência de Dados

O banco de dados SQLite (`dev.db`) e os PDFs (`/uploads`) foram configurados via "Volumes" no `docker-compose.yml`. Isso significa que todos os cadastros e anexos ficam salvos nas pastas nativas do Ubuntu (`/opt/gerenciamento_de_contratos/backend/prisma` e `/opt/gerenciamento_de_contratos/backend/uploads`).

Se você precisar reiniciar o servidor ou derrubar os contêineres:
```bash
sudo docker compose down
sudo docker compose up -d
```
Os dados **não** serão perdidos.

---

## 4. Atualizando o Sistema no Futuro

Se houver novas atualizações de código no Github, é muito fácil atualizar seu servidor:

```bash
# 1. Entre na pasta do projeto
cd /opt/gerenciamento_de_contratos

# 2. Puxe as atualizações
sudo git pull origin main

# 3. Recrie as imagens e suba os contêineres novamente
sudo docker compose up --build -d
```
