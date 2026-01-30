// Types TypeScript communs pour l'application

// Export des types de base de données
export * from './database.types';

// Types API
export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

// Types de formulaires
export interface FormData {
  [key: string]: string | number | boolean;
}
