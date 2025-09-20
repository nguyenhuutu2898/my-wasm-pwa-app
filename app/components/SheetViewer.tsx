'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  enqueuePendingOperation,
  loadSheetCache,
  overwritePendingOperations,
  readPendingOperations,
  saveSheetCache,
  type PendingOperation,
} from '@/app/lib/offline-cache'

type Props = {
  sheetId: string
  tabNames: string[]
}

type GridMetaCell = {
  isFormula: boolean
  options: string[] | null
  effectiveValue: unknown
}

type Feedback = {
  type: 'success' | 'error'
  message: string
}

type SheetStats = {
  rowCount: number
  columnCount: number
}

const detectFieldTypeFromCell = (cell?: GridMetaCell | null) => {
  if (!cell?.effectiveValue) return 'text'

  const effective = cell.effectiveValue as Record<string, unknown>
  if ('numberValue' in effective) return 'number'
  if ('boolValue' in effective) return 'boolean'
  if ('stringValue' in effective) {
    const value = String(effective.stringValue)
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date'
    return 'text'
  }
  return 'text'
}

const SheetViewer = ({ sheetId, tabNames }: Props) => {
  const [selectedTab, setSelectedTab] = useState(() => tabNames[0] ?? '')
  const [tableData, setTableData] = useState<string[][]>([])
  const [gridMeta, setGridMeta] = useState<GridMetaCell[][]>([])
  const [sheetStats, setSheetStats] = useState<SheetStats>({ rowCount: 0, columnCount: 0 })
  const [rawSheet, setRawSheet] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [selectedRowPosition, setSelectedRowPosition] = useState<number | null>(null)
  const [selectedRowNumber, setSelectedRowNumber] = useState<number | null>(null)
  const [selectedRowOriginal, setSelectedRowOriginal] = useState<string[] | null>(null)
  const [editRow, setEditRow] = useState<string[] | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isAppending, setIsAppending] = useState(false)
  const [newRow, setNewRow] = useState<string[]>([])
  const [showRaw, setShowRaw] = useState(false)

  useEffect(() => {
    if (tabNames.length > 0 && !tabNames.includes(selectedTab)) {
      setSelectedTab(tabNames[0]!)
    }
  }, [tabNames, selectedTab])

  const headers = useMemo(() => tableData[0] ?? [], [tableData])
  const dataRows = useMemo(() => tableData.slice(1), [tableData])

  const hasSelection = selectedRowPosition !== null && editRow !== null && selectedRowOriginal !== null

  const fetchSheetData = useCallback(
    async (tab: string) => {
      if (!tab) return

      setLoading(true)
      setFeedback(null)
    setSelectedRowPosition(null)
    setSelectedRowNumber(null)
    setSelectedRowOriginal(null)
    setEditRow(null)

    try {
      const response = await fetch(`/api/sheets/${sheetId}?tab=${encodeURIComponent(tab)}`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        const cached = loadSheetCache(sheetId, tab)
        if (cached) {
          setTableData(cached.tableData)
          setGridMeta(cached.gridMeta)
          setRawSheet(cached.rawSheet)
          setSheetStats(cached.sheetStats)
          const cachedColumns = cached.sheetStats.columnCount || cached.tableData[0]?.length || 1
          setNewRow(Array.from({ length: cachedColumns }, () => ''))
          setFeedback({
            type: 'error',
            message: 'Không thể tải dữ liệu mới. Đang hiển thị bản lưu gần nhất.',
          })
          return
        }

        setFeedback({
          type: 'error',
          message: 'Không thể tải dữ liệu sheet. Vui lòng kiểm tra quyền truy cập.',
        })
        setTableData([])
        setGridMeta([])
        setRawSheet(null)
        return
      }

      const json = await response.json()
      if (!json?.success) {
        throw new Error('FAILED_TO_FETCH')
      }

      const targetSheet = json.rawSheet?.sheets?.[0]
      const rawRows = targetSheet?.data?.[0]?.rowData ?? []

      const table: string[][] = json.tableData ?? []
      const meta: GridMetaCell[][] = json.gridMeta ?? []
      const columnCount = json.sheetStats?.columnCount ?? (table[0]?.length ?? targetSheet?.properties?.gridProperties?.columnCount ?? 0)
      const rowCount = json.sheetStats?.rowCount ?? Math.max(table.length - 1, 0)

      setTableData(table)
      setGridMeta(meta)
      setRawSheet(json.rawSheet)
      setSheetStats({ rowCount, columnCount })
      setNewRow(Array.from({ length: columnCount || 1 }, () => ''))

      saveSheetCache({
        sheetId,
        tab,
        tableData: table,
        gridMeta: meta,
        sheetStats: { rowCount, columnCount },
        rawSheet: json.rawSheet,
        timestamp: Date.now(),
      })
    } catch (error) {
      console.error('Failed to fetch sheet data', error)
      const cached = loadSheetCache(sheetId, tab)
      if (cached) {
        setTableData(cached.tableData)
        setGridMeta(cached.gridMeta)
        setRawSheet(cached.rawSheet)
        setSheetStats(cached.sheetStats)
        const cachedColumns = cached.sheetStats.columnCount || cached.tableData[0]?.length || 1
        setNewRow(Array.from({ length: cachedColumns }, () => ''))
        setFeedback({
          type: 'error',
          message: 'Không có kết nối. Đang hiển thị dữ liệu đã lưu.',
        })
      } else {
        setFeedback({ type: 'error', message: 'Có lỗi khi tải dữ liệu sheet.' })
        setTableData([])
        setGridMeta([])
        setRawSheet(null)
      }
    } finally {
      setLoading(false)
    }
  }, [sheetId])

  useEffect(() => {
    if (selectedTab) {
      fetchSheetData(selectedTab)
    }
  }, [fetchSheetData, selectedTab])

  const processPendingOperations = useCallback(
    async (force?: boolean) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine && !force) {
        return
      }

      const queue = readPendingOperations()
      if (!queue.length) {
        return
      }

      const remaining: PendingOperation[] = []
      let hasSyncedCurrentTab = false

      for (const operation of queue) {
        try {
          if (operation.type === 'update') {
            const res = await fetch(`/api/sheets/${operation.sheetId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tab: operation.tab, ...(operation.payload as any) }),
            })
            if (!res.ok) {
              remaining.push(operation)
              if (res.status >= 500) {
                break
              }
              continue
            }
          } else if (operation.type === 'append') {
            const res = await fetch(`/api/sheets/${operation.sheetId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tab: operation.tab, ...(operation.payload as any) }),
            })
            if (!res.ok) {
              remaining.push(operation)
              if (res.status >= 500) {
                break
              }
              continue
            }
          }

          if (operation.sheetId === sheetId && operation.tab === selectedTab) {
            hasSyncedCurrentTab = true
          }
        } catch (error) {
          console.error('Failed to process queued operation', error)
          remaining.push(operation)
          break
        }
      }

      overwritePendingOperations(remaining)

      if (queue.length !== remaining.length) {
        setFeedback({ type: 'success', message: 'Đã đồng bộ các thay đổi khi có kết nối.' })
        if (hasSyncedCurrentTab) {
          await fetchSheetData(selectedTab)
        }
      }
    },
    [fetchSheetData, selectedTab, sheetId]
  )

  useEffect(() => {
    processPendingOperations(true).catch((error) => console.error(error))
    const handleOnline = () => {
      processPendingOperations().catch((error) => console.error(error))
    }

    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [processPendingOperations])

  const handleSave = async () => {
    if (!hasSelection || !editRow || !selectedRowNumber) {
      return
    }

    const hasChanges = editRow.some((value, index) => value !== selectedRowOriginal?.[index])
    if (!hasChanges) {
      setFeedback({ type: 'error', message: 'Không có thay đổi nào để lưu.' })
      return
    }

    try {
      setIsSaving(true)
      setFeedback(null)
      const response = await fetch(`/api/sheets/${sheetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tab: selectedTab,
          rowNumber: selectedRowNumber,
          values: editRow,
        }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          setFeedback({ type: 'error', message: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' })
          return
        }

        const body = await response.json().catch(() => ({}))
        console.error('Update failed', body)
        setFeedback({ type: 'error', message: 'Không thể lưu thay đổi. Kiểm tra quyền chỉnh sửa.' })
        return
      }

      setFeedback({ type: 'success', message: 'Đã lưu thay đổi vào Google Sheets.' })
      await fetchSheetData(selectedTab)
    } catch (error) {
      console.error('Error while saving row', error)
      const operation: PendingOperation = {
        id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}`,
        sheetId,
        tab: selectedTab,
        type: 'update',
        payload: {
          rowNumber: selectedRowNumber,
          values: editRow,
        },
        createdAt: Date.now(),
      }
      enqueuePendingOperation(operation)
      let optimisticTable: string[][] = []
      setTableData((prev) => {
        const clone = prev.map((row, index) => (index === selectedRowPosition ? [...editRow] : [...row]))
        optimisticTable = clone
        return clone
      })
      saveSheetCache({
        sheetId,
        tab: selectedTab,
        tableData: optimisticTable,
        gridMeta,
        sheetStats,
        rawSheet,
        timestamp: Date.now(),
      })
      setFeedback({
        type: 'error',
        message: 'Không có kết nối. Đã lưu thay đổi vào hàng đợi, sẽ tự động đồng bộ khi online.',
      })
    } finally {
      setIsSaving(false)
      setSelectedRowPosition(null)
      setSelectedRowNumber(null)
      setSelectedRowOriginal(null)
      setEditRow(null)
    }
  }

  const handleAppend = async () => {
    const columnCount = sheetStats.columnCount || newRow.length || 1

    const hasValue = newRow.some((value) => value.trim() !== '')
    if (!hasValue) {
      setFeedback({ type: 'error', message: 'Nhập ít nhất một giá trị trước khi thêm dòng mới.' })
      return
    }

    try {
      setIsAppending(true)
      setFeedback(null)
      const response = await fetch(`/api/sheets/${sheetId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tab: selectedTab,
          values: newRow,
        }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          setFeedback({ type: 'error', message: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' })
          return
        }

        const body = await response.json().catch(() => ({}))
        console.error('Append failed', body)
        setFeedback({ type: 'error', message: 'Không thể thêm dòng mới. Kiểm tra quyền chỉnh sửa.' })
        return
      }

      setFeedback({ type: 'success', message: 'Đã thêm dòng mới vào sheet.' })
      await fetchSheetData(selectedTab)
    } catch (error) {
      console.error('Error while appending row', error)
      const operation: PendingOperation = {
        id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}`,
        sheetId,
        tab: selectedTab,
        type: 'append',
        payload: { values: newRow },
        createdAt: Date.now(),
      }
      enqueuePendingOperation(operation)
      let optimisticTable: string[][] = []
      let optimisticStats: SheetStats = sheetStats
      setTableData((prev) => {
        if (prev.length === 0) {
          const header = headers.length ? [...headers] : []
          optimisticTable = header.length ? [header, [...newRow]] : [[...newRow]]
          return optimisticTable
        }
        const clone = prev.map((row) => [...row])
        clone.push([...newRow])
        optimisticTable = clone
        return clone
      })
      let optimisticMeta: GridMetaCell[][] = gridMeta
      setGridMeta((prev) => {
        const clone = prev.map((row) => [...row])
        const columnLen = headers.length || newRow.length || 1
        clone.push(Array.from({ length: columnLen }, () => ({ isFormula: false, options: null, effectiveValue: null })))
        optimisticMeta = clone as GridMetaCell[][]
        return clone
      })
      setSheetStats((prev) => {
        const updated = { rowCount: prev.rowCount + 1, columnCount: prev.columnCount }
        optimisticStats = updated
        return updated
      })
      saveSheetCache({
        sheetId,
        tab: selectedTab,
        tableData: optimisticTable,
        gridMeta: optimisticMeta,
        sheetStats: optimisticStats,
        rawSheet,
        timestamp: Date.now(),
      })
      setFeedback({
        type: 'error',
        message: 'Không có kết nối. Dòng mới đã được lưu để đồng bộ khi có mạng.',
      })
    } finally {
      setIsAppending(false)
      setNewRow(Array.from({ length: columnCount }, () => ''))
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {tabNames.length === 0 ? (
              <span className="text-sm text-slate-500">Sheet này chưa có trang nào.</span>
            ) : (
              tabNames.map((tab) => {
                const isActive = tab === selectedTab
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSelectedTab(tab)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab}
                  </button>
                )
              })
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span>
              Hàng: <strong>{sheetStats.rowCount}</strong>
            </span>
            <span>
              Cột: <strong>{sheetStats.columnCount}</strong>
            </span>
            <button
              type="button"
              onClick={() => setShowRaw((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
            >
              {showRaw ? 'Ẩn dữ liệu thô' : 'Hiển thị dữ liệu thô'}
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm shadow-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-600'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {showRaw && (
        <div className="rounded-2xl border border-slate-200 bg-slate-950/90 p-4 text-xs text-slate-100">
          <div className="mb-2 text-slate-300">Dữ liệu thô (JSON)</div>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap">
            {JSON.stringify(rawSheet, null, 2)}
          </pre>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white/70 shadow-sm">
        {loading ? (
          <div className="space-y-3 p-6">
            <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
            <div className="h-48 animate-pulse rounded bg-slate-100" />
          </div>
        ) : tableData.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">Không có dữ liệu trong sheet này.</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-slate-100 text-left">
                <tr>
                  {headers.map((header, index) => (
                    <th key={index} className="sticky top-0 border-b border-slate-200 px-4 py-3 font-semibold text-slate-600">
                      {header || `Cột ${index + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, rowIndex) => {
                  const absoluteIndex = rowIndex + 1
                  const isActive = absoluteIndex === selectedRowPosition

                  return (
                    <tr
                      key={`${absoluteIndex}-${row.join('-')}`}
                      onClick={() => {
                        setSelectedRowPosition(absoluteIndex)
                        setSelectedRowNumber(absoluteIndex + 1)
                        setSelectedRowOriginal([...row])
                        setEditRow([...row])
                        setFeedback(null)
                      }}
                      className={`cursor-pointer border-b border-slate-100 transition hover:bg-indigo-50/60 ${
                        isActive ? 'bg-indigo-50/70' : ''
                      }`}
                    >
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-4 py-3 text-slate-700">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {hasSelection && editRow && selectedRowNumber && (
        <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Chỉnh sửa dòng #{selectedRowNumber}</h2>
              <p className="text-xs text-slate-500">Nhấn "Lưu thay đổi" để ghi đè dòng này trên Google Sheets.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedRowPosition(null)
                setSelectedRowNumber(null)
                setSelectedRowOriginal(null)
                setEditRow(null)
              }}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-500 hover:border-slate-400"
            >
              Hủy chọn
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {headers.map((header, index) => {
              const metaRow = selectedRowPosition !== null ? gridMeta[selectedRowPosition] : undefined
              const cellMeta = metaRow?.[index]
              const fieldType = detectFieldTypeFromCell(cellMeta)
              const isFormulaCell = cellMeta?.isFormula ?? false
              const options = cellMeta?.options
              const value = editRow[index] ?? ''
              const originalValue = selectedRowOriginal?.[index]
              const hasChanged = value !== originalValue

              const updateValue = (next: string) => {
                setEditRow((prev) => {
                  if (!prev) return prev
                  const copy = [...prev]
                  copy[index] = next
                  return copy
                })
              }

              return (
                <label key={index} className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-600">{header || `Cột ${index + 1}`}</span>
                  {options && options.length > 0 ? (
                    <select
                      value={value}
                      onChange={(event) => updateValue(event.target.value)}
                      disabled={isFormulaCell}
                      className={`rounded border px-3 py-2 text-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                        hasChanged ? 'border-amber-300 bg-amber-50' : 'border-slate-200'
                      } ${isFormulaCell ? 'cursor-not-allowed bg-slate-100 text-slate-400' : ''}`}
                    >
                      {options.map((option, optionIndex) => (
                        <option key={optionIndex} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : fieldType === 'boolean' ? (
                    <select
                      value={value}
                      onChange={(event) => updateValue(event.target.value)}
                      disabled={isFormulaCell}
                      className={`rounded border px-3 py-2 text-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                        hasChanged ? 'border-amber-300 bg-amber-50' : 'border-slate-200'
                      } ${isFormulaCell ? 'cursor-not-allowed bg-slate-100 text-slate-400' : ''}`}
                    >
                      <option value="true">Đúng</option>
                      <option value="false">Sai</option>
                    </select>
                  ) : fieldType === 'date' ? (
                    <input
                      type="date"
                      value={value ? value.substring(0, 10) : ''}
                      onChange={(event) => updateValue(event.target.value)}
                      readOnly={isFormulaCell}
                      className={`rounded border px-3 py-2 text-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                        hasChanged ? 'border-amber-300 bg-amber-50' : 'border-slate-200'
                      } ${isFormulaCell ? 'cursor-not-allowed bg-slate-100 text-slate-400' : ''}`}
                    />
                  ) : (
                    <input
                      type={fieldType}
                      value={value}
                      onChange={(event) => updateValue(event.target.value)}
                      readOnly={isFormulaCell}
                      className={`rounded border px-3 py-2 text-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                        hasChanged ? 'border-amber-300 bg-amber-50' : 'border-slate-200'
                      } ${isFormulaCell ? 'cursor-not-allowed bg-slate-100 text-slate-400' : ''}`}
                    />
                  )}
                  {isFormulaCell && (
                    <span className="text-xs text-slate-400">Ô công thức – không thể chỉnh sửa tại đây.</span>
                  )}
                </label>
              )
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditRow(selectedRowOriginal ? [...selectedRowOriginal] : null)
              }}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-400"
            >
              Hoàn tác
            </button>
          </div>
        </div>
      )}

      {headers.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-emerald-700">Thêm dòng mới</h2>
          <p className="mt-1 text-xs text-emerald-600">Nhập giá trị cho từng cột rồi nhấn "Thêm dòng" để append vào sheet.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {headers.map((header, index) => (
              <label key={index} className="flex flex-col gap-1 text-sm text-emerald-700">
                <span className="font-medium">{header || `Cột ${index + 1}`}</span>
                <input
                  type="text"
                  value={newRow[index] ?? ''}
                  onChange={(event) => {
                    const value = event.target.value
                    setNewRow((prev) => {
                      const copy = [...prev]
                      copy[index] = value
                      return copy
                    })
                  }}
                  placeholder="Nhập giá trị"
                  className="rounded border border-emerald-200 px-3 py-2 text-sm text-emerald-800 placeholder:text-emerald-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </label>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleAppend}
              disabled={isAppending}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAppending ? 'Đang thêm…' : 'Thêm dòng'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

export default SheetViewer
