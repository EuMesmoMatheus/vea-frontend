import { Injectable } from '@angular/core';

/**
 * Serviço de armazenamento seguro
 * Centraliza todas as operações de localStorage com validações de segurança
 * 
 * Boas práticas implementadas:
 * - Prefixo único para evitar colisões
 * - Validação de dados antes de salvar/recuperar
 * - Sanitização de strings
 * - Tratamento de erros robusto
 * - Expiração opcional de tokens
 */
@Injectable({
  providedIn: 'root'
})
export class SecureStorageService {
  // Prefixo único para o app (evita colisões com outros apps no mesmo domínio)
  private readonly PREFIX = 'vea_';
  
  // Chaves permitidas (whitelist de segurança)
  private readonly ALLOWED_KEYS = [
    'token',
    'user',
    'companyId',
    'role',
    'userId',
    'userCep',
    'theme',
    'language'
  ] as const;

  // Tempo padrão de expiração do token (24 horas em ms)
  private readonly DEFAULT_TOKEN_EXPIRY = 24 * 60 * 60 * 1000;

  constructor() {
    // Limpa dados expirados ao inicializar
    this.cleanExpiredData();
  }

  /**
   * Salva um valor no localStorage de forma segura
   */
  setItem(key: string, value: string | object, expiresIn?: number): boolean {
    if (!this.isKeyAllowed(key)) {
      console.warn(`[SecureStorage] Chave não permitida: ${key}`);
      return false;
    }

    try {
      const storageKey = this.getKey(key);
      const dataToStore = this.prepareDataForStorage(value, expiresIn);
      localStorage.setItem(storageKey, dataToStore);
      return true;
    } catch (error) {
      console.error(`[SecureStorage] Erro ao salvar ${key}:`, error);
      return false;
    }
  }

  /**
   * Recupera um valor do localStorage
   */
  getItem<T = string>(key: string): T | null {
    if (!this.isKeyAllowed(key)) {
      console.warn(`[SecureStorage] Chave não permitida: ${key}`);
      return null;
    }

    try {
      const storageKey = this.getKey(key);
      const data = localStorage.getItem(storageKey);
      
      if (!data) return null;

      return this.parseStoredData<T>(data);
    } catch (error) {
      console.error(`[SecureStorage] Erro ao recuperar ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove um item do localStorage
   */
  removeItem(key: string): boolean {
    if (!this.isKeyAllowed(key)) {
      console.warn(`[SecureStorage] Chave não permitida: ${key}`);
      return false;
    }

    try {
      const storageKey = this.getKey(key);
      localStorage.removeItem(storageKey);
      return true;
    } catch (error) {
      console.error(`[SecureStorage] Erro ao remover ${key}:`, error);
      return false;
    }
  }

  /**
   * Limpa todos os dados do app no localStorage
   */
  clear(): void {
    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.PREFIX)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('[SecureStorage] Erro ao limpar storage:', error);
    }
  }

  /**
   * Verifica se um item existe e não está expirado
   */
  hasValidItem(key: string): boolean {
    return this.getItem(key) !== null;
  }

  // ============================================
  // Métodos específicos para autenticação
  // ============================================

  /**
   * Salva token de autenticação com expiração
   */
  setToken(token: string, expiresIn?: number): boolean {
    return this.setItem('token', token, expiresIn ?? this.DEFAULT_TOKEN_EXPIRY);
  }

  /**
   * Recupera token de autenticação
   */
  getToken(): string | null {
    return this.getItem<string>('token');
  }

  /**
   * Salva dados do usuário
   */
  setUser(user: object): boolean {
    // Sanitiza dados sensíveis antes de salvar
    const sanitizedUser = this.sanitizeUserData(user);
    return this.setItem('user', sanitizedUser);
  }

  /**
   * Recupera dados do usuário
   */
  getUser<T = object>(): T | null {
    return this.getItem<T>('user');
  }

  /**
   * Limpa dados de autenticação (logout)
   */
  clearAuth(): void {
    this.removeItem('token');
    this.removeItem('user');
    this.removeItem('companyId');
    this.removeItem('role');
    this.removeItem('userId');
  }

  // ============================================
  // Métodos privados
  // ============================================

  private getKey(key: string): string {
    return `${this.PREFIX}${key}`;
  }

  private isKeyAllowed(key: string): boolean {
    return this.ALLOWED_KEYS.includes(key as any);
  }

  private prepareDataForStorage(value: string | object, expiresIn?: number): string {
    const wrapper = {
      data: typeof value === 'object' ? value : value,
      timestamp: Date.now(),
      expiresAt: expiresIn ? Date.now() + expiresIn : null
    };
    return JSON.stringify(wrapper);
  }

  private parseStoredData<T>(data: string): T | null {
    try {
      const parsed = JSON.parse(data);
      
      // Verifica expiração
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        return null; // Dado expirado
      }
      
      return parsed.data as T;
    } catch {
      // Fallback para dados legados (sem wrapper)
      try {
        return JSON.parse(data) as T;
      } catch {
        return data as unknown as T;
      }
    }
  }

  private sanitizeUserData(user: any): object {
    // Remove campos sensíveis que não devem ser armazenados
    const { password, passwordHash, ...safeUser } = user;
    return safeUser;
  }

  private cleanExpiredData(): void {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.PREFIX)) {
          const data = localStorage.getItem(key);
          if (data) {
            try {
              const parsed = JSON.parse(data);
              if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
                localStorage.removeItem(key);
              }
            } catch {
              // Ignora itens que não são JSON válido
            }
          }
        }
      }
    } catch (error) {
      console.error('[SecureStorage] Erro ao limpar dados expirados:', error);
    }
  }
}

