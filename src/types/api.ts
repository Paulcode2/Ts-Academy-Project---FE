export interface ApiSuccessResponse<T> {
  success: true
  message: string
  data: T
}

export interface ApiErrorResponse {
  success: false
  message: string
  data: null
  details?: unknown
}

export interface ValidationErrorResponse extends ApiErrorResponse {
  details: Record<string, string | string[]>
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: Pagination
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse