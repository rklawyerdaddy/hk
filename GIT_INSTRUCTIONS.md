# Instruções de Git e Deploy

## 1. No seu Computador (Local)

Para enviar as alterações que fizemos (novo domínio, SSL, senha) para o GitHub:

Abra o terminal na pasta do projeto (`c:\Users\Raul\Desktop\HK`) e execute:

```bash
# 1. Adicionar todas as alterações
git add .

# 2. Salvar as alterações (Commit)
git commit -m "Atualizando dominio, SSL e senha admin"

# 3. Enviar para o GitHub
git push
```

---

## 2. Na sua VPS (Servidor)

Para baixar as alterações e aplicar no servidor:

1.  **Conecte-se à VPS**:
    ```bash
    ssh root@SEU_IP_DA_VPS
    ```

2.  **Entre na pasta do projeto**:
    ```bash
    cd HK
    ```

3.  **Baixe as atualizações**:
    ```bash
    git pull
    ```

4.  **Configure o SSL (Apenas desta vez)**:
    Como criamos um script novo para o SSL, precisamos dar permissão e rodar ele:
    ```bash
    chmod +x init-letsencrypt.sh
    ./init-letsencrypt.sh
    ```
    *(Responda 'y' se ele perguntar algo)*

5.  **Reinicie o sistema**:
    Para garantir que a nova senha e configurações sejam aplicadas:
    ```bash
    docker compose down
    docker compose up -d --build
    ```
