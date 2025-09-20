'use client'

const SHEET_CACHE_KEY = 'sheet-cache'
const SHEET_QUEUE_KEY = 'sheet-sync-queue'

export type CachedSheetPayload = {
  sheetId: string
  tab: string
  tableData: string[][]
  gridMeta: Array<Array<{ isFormula: boolean; options: string[] | null; effectiveValue: unknown }>>
  sheetStats: { rowCount: number; columnCount: number }
  rawSheet: unknown
  timestamp: number
}

export type PendingOperation = {
  id: string
  sheetId: string
  tab: string
  type: 'update' | 'append'
  payload: unknown
  createdAt: number
}

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const value = window.localStorage.getItem(key)
    if (!value) return fallback
    return JSON.parse(value) as T
  } catch (error) {
    console.error('Failed to read cache', error)
    return fallback
  }
}

function writeJSON<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error('Failed to write cache', error)
  }
}

export function saveSheetCache(payload: CachedSheetPayload) {
  const cache = readJSON<Record<string, CachedSheetPayload>>(SHEET_CACHE_KEY, {})
  cache[`${payload.sheetId}:${payload.tab}`] = payload
  writeJSON(SHEET_CACHE_KEY, cache)
}

export function loadSheetCache(sheetId: string, tab: string) {
  const cache = readJSON<Record<string, CachedSheetPayload>>(SHEET_CACHE_KEY, {})
  return cache[`${sheetId}:${tab}`]
}

export function enqueuePendingOperation(operation: PendingOperation) {
  const queue = readJSON<PendingOperation[]>(SHEET_QUEUE_KEY, [])
  queue.push(operation)
  writeJSON(SHEET_QUEUE_KEY, queue)
}

export function readPendingOperations() {
  return readJSON<PendingOperation[]>(SHEET_QUEUE_KEY, [])
}

export function overwritePendingOperations(operations: PendingOperation[]) {
  writeJSON(SHEET_QUEUE_KEY, operations)
}

export function clearPendingOperations() {
  writeJSON(SHEET_QUEUE_KEY, [])
}
