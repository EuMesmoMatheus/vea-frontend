// @ts-check
const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");

module.exports = tseslint.config(
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      // ============================================
      // Regras Angular
      // ============================================
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: "app",
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: "app",
          style: "kebab-case",
        },
      ],

      // ============================================
      // Regras de Segurança (OWASP)
      // ============================================
      
      // Evita eval() e similares (Injection)
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      
      // Evita uso de innerHTML (XSS)
      "@typescript-eslint/no-unsafe-member-access": "warn",
      
      // Evita console.log em produção (Information Disclosure)
      "no-console": ["warn", { allow: ["warn", "error"] }],
      
      // Requer uso estrito de igualdade
      "eqeqeq": ["error", "always"],
      
      // Evita variáveis não usadas
      "@typescript-eslint/no-unused-vars": ["error", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }],
      
      // Evita any explícito (Type Safety)
      "@typescript-eslint/no-explicit-any": "warn",
      
      // Evita assertions de tipo desnecessárias
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      
      // Requer tipos de retorno explícitos em funções públicas
      "@typescript-eslint/explicit-function-return-type": ["warn", {
        allowExpressions: true,
        allowTypedFunctionExpressions: true
      }],

      // ============================================
      // Regras de Qualidade de Código
      // ============================================
      
      // Complexidade ciclomática máxima
      "complexity": ["warn", 15],
      
      // Máximo de linhas por função
      "max-lines-per-function": ["warn", { max: 100, skipBlankLines: true, skipComments: true }],
      
      // Máximo de parâmetros por função
      "max-params": ["warn", 5],
      
      // Profundidade máxima de aninhamento
      "max-depth": ["warn", 4],
      
      // Evita código duplicado implícito
      "no-duplicate-imports": "error",
      
      // Requer use strict implícito
      "strict": ["error", "safe"],

      // ============================================
      // Regras de Boas Práticas
      // ============================================
      
      // Evita atribuições em condições
      "no-cond-assign": "error",
      
      // Evita debugger em produção
      "no-debugger": "error",
      
      // Evita with statement
      "no-with": "error",
      
      // Requer return em callbacks de arrays
      "array-callback-return": "error",
      
      // Evita await dentro de loops (performance)
      "no-await-in-loop": "warn",
      
      // Evita promessas não tratadas
      "@typescript-eslint/no-floating-promises": "warn",
      
      // Prefer const sobre let quando possível
      "prefer-const": "error",
      
      // Evita var, use let/const
      "no-var": "error",
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {
      // ============================================
      // Regras de Template Angular
      // ============================================
      
      // Acessibilidade
      "@angular-eslint/template/click-events-have-key-events": "warn",
      "@angular-eslint/template/mouse-events-have-key-events": "warn",
      "@angular-eslint/template/no-autofocus": "warn",
      
      // Segurança de template
      "@angular-eslint/template/no-any": "warn",
    },
  },
  {
    // Configuração específica para arquivos de teste
    files: ["**/*.spec.ts", "**/*.test.ts"],
    rules: {
      // Relaxa regras para testes
      "@typescript-eslint/no-explicit-any": "off",
      "max-lines-per-function": "off",
      "no-console": "off",
    },
  }
);

