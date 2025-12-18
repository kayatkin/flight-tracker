// src\shared\types\common.ts
// Общие утилитарные типы

// Тип для функции, которая может быть асинхронной
export type AsyncFunction<T = void> = () => Promise<T>;

// Тип для обработчика событий
export type EventHandler<T = any> = (event: T) => void;

// Тип для состояния загрузки
export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

// Тип для пагинации
export interface Pagination<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Тип для фильтров
export type FilterValue = string | number | boolean | Date | string[];

export interface FilterOptions {
  [key: string]: FilterValue;
}