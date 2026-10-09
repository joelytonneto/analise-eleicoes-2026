# 🗳️ DivulgaBR 2026 - Painel Analítico e Auditoria das Eleições

Sistema de alta fidelidade para auditoria, exploração cartográfica e inteligência eleitoral das **Eleições Gerais**, permitindo navegação territorial contínua com **drill-down em múltiplos níveis**: desde a visão macro nacional até o nível micro da **Seção Eleitoral (Boletim de Urna - BU)** com validação direta no TSE.

---

## 🎯 Destaques e Funcionalidades

### 1. Design Institucional & Modos White e Dark (UI/UX Pro Max)
* **Modo Claro (White Mode) & Modo Escuro (Dark Mode):** Alternância instantânea no cabeçalho com persistência em `localStorage`.
* **Estética de Gov-Tech / Auditoria Cívica:** Tipografia de alto contraste, alinhamento tabular (`font-mono tabular-nums`), eliminação de poluição visual e layout 100% responsivo e anti-wrap.
* **Espelho do Boletim de Urna (BU):** Renderização fiel ao formato térmico oficial da Justiça Eleitoral, com cabeçalho de autenticação, chaves de segurança e conferência de votos.

### 2. Validação e Auditoria Direta no TSE
* **Conexão Oficial com o TSE:** Cada seção possui link direto que abre a urna no portal oficial do Tribunal Superior Eleitoral (`resultados.tse.jus.br`) e o arquivo JSON bruto de totalização.
* **BUs Autênticos:** Totalização com números 100% idênticos aos divulgados pela Justiça Eleitoral para seções reais (ex: Seção 0393 e 0396 da 78ª Zona Eleitoral em Itaitinga-CE).

### 3. Navegação Cartográfica Multi-Nível
* **Nível 1 - Brasil (Nacional):** Mapa interativo com as 27 UFs com basemaps Light Gray, Dark Canvas, OpenStreetMap e Satélite.
* **Nível 2 - Estado (UF):** Seleção de municípios com liderança partidária e total de urnas.
* **Nível 3 - Município (Cidades):** Filtro por **Zona Eleitoral** oficial (ex: as 17 zonas de Fortaleza) e busca por escolas/colégios de votação.
* **Nível 4 - Seção Eleitoral:** Acesso individual a cada urna com abertura do espelho do BU.

### 4. Busca Universal Rápida (`Ctrl + K`)
* Reconhecimento inteligente de sintaxe:
  * Nome do município ou UF (ex: `Itaitinga`, `SP`, `Fortaleza`).
  * Zona e seção eleitoral (ex: `Zona 078`, `Seção 0393`, `0393`).

---

## 🚀 Como Publicar no GitHub (Passo a Passo)

Para disponibilizar esta aplicação como um site público acessível de qualquer lugar na web através do **GitHub Pages**:

### Passo 1: Inicializar o Repositório Git Localmente
No terminal do projeto, execute:
```bash
git init
git add .
git commit -m "feat: release painel eleicoes 2026 com modo light/dark e deploy github pages"
```

### Passo 2: Criar o Repositório no GitHub
1. Acesse [github.com/new](https://github.com/new).
2. Dê um nome ao seu repositório (exemplo: `analise-eleicoes-2026`).
3. Deixe o repositório como **Public** (Público).
4. **Não** marque para inicializar com README ou .gitignore (eles já existem no projeto).
5. Clique em **Create repository**.

### Passo 3: Enviar o Código para o GitHub
Copie os comandos exibidos no GitHub e rode no terminal:
```bash
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/analise-eleicoes-2026.git
git push -u origin main
```
*(Substitua `SEU_USUARIO` pelo seu usuário do GitHub)*.

### Passo 4: Ativar o GitHub Pages com GitHub Actions
1. No seu repositório no GitHub, clique na aba **Settings** (Configurações).
2. No menu lateral esquerdo, clique em **Pages**.
3. Em **Build and deployment** > **Source**, altere de *"Deploy from a branch"* para **"GitHub Actions"**.
4. Pronto! O workflow automático que já configuramos em `.github/workflows/deploy.yml` será acionado.
5. Em 1 a 2 minutos, seu link público estará no ar no formato:
   **`https://SEU_USUARIO.github.io/analise-eleicoes-2026/`**

---

## 💻 Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Rodar servidor local (Vite)
npm run dev

# Compilar para produção
npm run build
```
