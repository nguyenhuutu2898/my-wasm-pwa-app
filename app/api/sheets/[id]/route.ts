import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'

const GOOGLE_SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

async function getAccessToken() {
  const session: any = await getServerSession(authOptions)
  const accessToken = session?.accessToken
  if (!accessToken) {
    throw new Error('UNAUTHORIZED')
  }
  return accessToken as string
}

type GridMetaCell = {
  isFormula: boolean
  options: string[] | null
  effectiveValue: unknown
}

async function fetchSheetData(sheetId: string, tab: string, accessToken: string) {
  const url = `${GOOGLE_SHEETS_BASE}/${sheetId}?includeGridData=true&ranges=${encodeURIComponent(tab)}`
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    return NextResponse.json(
      {
        success: false,
        error: 'FAILED_TO_FETCH_SHEET',
        status: response.status,
        details: errorBody,
      },
      { status: response.status }
    )
  }

  const json = await response.json()
  const sheet = json?.sheets?.[0]
  const rawRows = sheet?.data?.[0]?.rowData ?? []

  const tableData: string[][] = rawRows.map((row: any) =>
    (row.values ?? []).map((cell: any) => cell?.formattedValue ?? '')
  )

  const gridMeta: GridMetaCell[][] = rawRows.map((row: any) =>
    (row.values ?? []).map((cell: any) => ({
      isFormula: Boolean(cell?.userEnteredValue?.formulaValue),
      options:
        cell?.dataValidation?.condition?.type === 'ONE_OF_LIST'
          ? (cell.dataValidation.condition.values ?? []).map((value: any) => value.userEnteredValue ?? '')
          : null,
      effectiveValue: cell?.effectiveValue ?? null,
    }))
  )

  const columnCount = tableData[0]?.length ?? sheet?.properties?.gridProperties?.columnCount ?? 0
  const rowCount = Math.max(tableData.length - 1, 0)

  return NextResponse.json({
    success: true,
    tableData,
    gridMeta,
    sheetStats: {
      rowCount,
      columnCount,
    },
    rawSheet: json,
  })
}

async function updateRow(sheetId: string, body: any, accessToken: string) {
  const tab: string | undefined = body?.tab
  const rowNumber: number | undefined = body?.rowNumber
  const values: string[] | undefined = body?.values

  if (!tab || !rowNumber || !Array.isArray(values)) {
    return NextResponse.json(
      {
        success: false,
        error: 'INVALID_PAYLOAD',
      },
      { status: 400 }
    )
  }

  const columnCount = values.length || 1
  const columnLetter = columnIndexToLetter(columnCount)
  const range = `${tab}!A${rowNumber}:${columnLetter}${rowNumber}`

  const response = await fetch(
    `${GOOGLE_SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: [values],
      }),
    }
  )

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    return NextResponse.json(
      {
        success: false,
        error: 'FAILED_TO_UPDATE',
        status: response.status,
        details: errorBody,
      },
      { status: response.status }
    )
  }

  return NextResponse.json({ success: true })
}

async function appendRow(sheetId: string, body: any, accessToken: string) {
  const tab: string | undefined = body?.tab
  const values: string[] | undefined = body?.values

  if (!tab || !Array.isArray(values)) {
    return NextResponse.json(
      {
        success: false,
        error: 'INVALID_PAYLOAD',
      },
      { status: 400 }
    )
  }

  const columnCount = values.length || 1
  const columnLetter = columnIndexToLetter(columnCount)
  const appendRange = `${tab}!A:${columnLetter}`

  const response = await fetch(
    `${GOOGLE_SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(appendRange)}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [values],
      }),
    }
  )

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    return NextResponse.json(
      {
        success: false,
        error: 'FAILED_TO_APPEND',
        status: response.status,
        details: errorBody,
      },
      { status: response.status }
    )
  }

  return NextResponse.json({ success: true })
}

function columnIndexToLetter(columnIndex: number) {
  if (columnIndex <= 0) return 'A'
  let index = columnIndex
  let letter = ''
  while (index > 0) {
    const remainder = (index - 1) % 26
    letter = String.fromCharCode(65 + remainder) + letter
    index = Math.floor((index - 1) / 26)
  }
  return letter
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const tab = request.nextUrl.searchParams.get('tab')
  if (!tab) {
    return NextResponse.json(
      {
        success: false,
        error: 'TAB_REQUIRED',
      },
      { status: 400 }
    )
  }

  try {
    const accessToken = await getAccessToken()
    return await fetchSheetData(params.id, tab, accessToken)
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 })
    }
    return NextResponse.json({ success: false, error: 'UNKNOWN_ERROR' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const accessToken = await getAccessToken()
    const body = await request.json().catch(() => ({}))
    return await updateRow(params.id, body, accessToken)
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 })
    }
    return NextResponse.json({ success: false, error: 'UNKNOWN_ERROR' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const accessToken = await getAccessToken()
    const body = await request.json().catch(() => ({}))
    return await appendRow(params.id, body, accessToken)
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 })
    }
    return NextResponse.json({ success: false, error: 'UNKNOWN_ERROR' }, { status: 500 })
  }
}
