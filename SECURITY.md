# 🔐 Política de Segurança - VEA Frontend

## Visão Geral

Este documento descreve as práticas de segurança implementadas no VEA Frontend e como reportar vulnerabilidades.

## 📋 Práticas de Segurança Implementadas

### 1. Autenticação e Autorização

- **JWT (JSON Web Token)**: Tokens com expiração automática
- **Guards de Rota**: `AuthGuard` e `AdminGuard` protegem rotas sensíveis
- **Interceptor de Autenticação**: Adiciona headers automaticamente e trata erros 401/403

### 2. Proteção contra XSS (Cross-Site Scripting)

- **Sanitização de Input**: Interceptor de segurança sanitiza dados antes de enviar
- **Angular Template Security**: Templates Angular escapam HTML automaticamente
- **Content Security Policy**: Headers de segurança nas requisições

### 3. Proteção contra CSRF

- **SameSite Cookies**: Configuração de cookies com SameSite
- **Headers Customizados**: `X-Requested-With: XMLHttpRequest`

### 4. Armazenamento Seguro

- **SecureStorageService**: Serviço centralizado para localStorage
- **Prefixo de Namespace**: Evita colisões com outros apps
- **Expiração de Tokens**: Tokens expiram automaticamente
- **Whitelist de Chaves**: Apenas chaves permitidas podem ser armazenadas

### 5. Validação de Dados

- **Validators Angular**: Validação client-side em todos os formulários
- **Sanitização de Strings**: Remoção de tags HTML perigosas
- **Type Safety**: TypeScript com strict mode

## 🚨 Como Reportar Vulnerabilidades

### Contato Privado

Se você descobriu uma vulnerabilidade de segurança, **NÃO** crie uma issue pública.

Entre em contato diretamente:
- Email: [seu-email@exemplo.com]
- Assunto: `[SECURITY] VEA Frontend - Descrição breve`

### O que incluir no report

1. **Descrição**: Explique a vulnerabilidade
2. **Passos para Reproduzir**: Como explorar a vulnerabilidade
3. **Impacto**: Qual o potencial dano
4. **Sugestão de Correção**: Se tiver uma solução

### Tempo de Resposta

- **Confirmação**: 48 horas
- **Análise Inicial**: 7 dias
- **Correção**: Depende da severidade (crítico: 24h, alto: 7 dias, médio: 30 dias)

## 🛡️ Checklist de Segurança para Desenvolvedores

### Antes de cada commit

- [ ] Não commitou credenciais ou tokens
- [ ] Dados sensíveis não estão em logs (console.log)
- [ ] Inputs do usuário estão validados
- [ ] Não usou `innerHTML` ou `eval()`

### Code Review

- [ ] Verificou vazamento de dados sensíveis
- [ ] Verificou autenticação em novas rotas
- [ ] Verificou sanitização de inputs
- [ ] Verificou tratamento de erros (sem stack traces expostos)

## 📊 Análise de Código

### SonarCloud

O projeto usa SonarCloud para análise contínua:
- Vulnerabilidades de segurança
- Code smells
- Cobertura de testes
- Duplicação de código

### ESLint

Regras de segurança configuradas:
- `no-eval`: Proibido
- `no-implied-eval`: Proibido
- `no-new-func`: Proibido
- `eqeqeq`: Sempre usar `===`

## 🔄 Atualizações de Dependências

```bash
# Verificar vulnerabilidades
npm audit

# Corrigir automaticamente
npm audit fix

# Verificar atualizações disponíveis
npm outdated
```

## 📝 Logs e Monitoramento

### O que NÃO logar

- Senhas ou hashes
- Tokens de autenticação
- Dados pessoais (CPF, cartão de crédito)
- Stack traces completos em produção

### O que logar

- Tentativas de autenticação (sem senha)
- Erros de validação
- Ações administrativas
- Mudanças de permissão

## 🔑 Variáveis de Ambiente

Nunca commite:
- `SONAR_TOKEN`
- API Keys
- Credenciais de banco
- Tokens de terceiros

Use GitHub Secrets para CI/CD.

---

Última atualização: Dezembro 2025

