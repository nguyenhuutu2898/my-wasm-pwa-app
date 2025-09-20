import Link from "next/link"
import { getServerSession } from "next-auth"

import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options"
import SheetViewer from "@/app/components/SheetViewer"

type PageProps = {
  params: { id: string }
}

export default async function GoogleSheetDetailPage({ params }: PageProps) {
  const { id } = params
  const session: any = await getServerSession(authOptions)

  if (!session?.accessToken) {
    return (
      <section className="mx-auto w-full max-w-4xl px-4 py-16 text-center text-red-600">
        <h1 className="text-2xl font-semibold">Không có quyền truy cập</h1>
        <p className="mt-3 text-sm text-red-500">
          Vui lòng đăng nhập lại với tài khoản có quyền chỉnh sửa bảng tính này.
        </p>
      </section>
    )
  }

  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}`, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
    next: { revalidate: 30 },
  })

  if (!response.ok) {
    return (
      <section className="mx-auto w-full max-w-4xl px-4 py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50/80 p-6 text-red-700">
          <h1 className="text-lg font-semibold">Không thể tải dữ liệu</h1>
          <p className="mt-2 text-sm">
            Google Sheets trả về mã lỗi {response.status}. Hãy kiểm tra lại quyền truy cập của bạn hoặc thử làm mới trang.
          </p>
        </div>
      </section>
    )
  }

  const sheet = await response.json()
  const sheetTabs = sheet.sheets?.map((s: any) => s.properties?.title).filter(Boolean) ?? []
  const title = sheet?.properties?.title ?? "Không có tiêu đề"

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/google-sheet"
            className="mb-2 inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-500"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Quay về danh sách
          </Link>
          <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {sheetTabs.length} trang sheet · ID: <code className="select-all text-xs">{id}</code>
          </p>
        </div>
        <Link
          href={`https://docs.google.com/spreadsheets/d/${id}`}
          target="_blank"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm hover:border-indigo-300"
        >
          Mở trên Google Sheets
        </Link>
      </div>

      <SheetViewer sheetId={id} tabNames={sheetTabs} />

      <details className="mt-10 rounded-2xl border border-slate-200 bg-white/70 p-5 text-sm text-slate-600">
        <summary className="cursor-pointer font-semibold text-slate-700">
          Xem JSON trả về từ Google Sheets
        </summary>
        <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-slate-900/90 p-4 text-xs text-slate-100">
          {JSON.stringify(sheet, null, 2)}
        </pre>
      </details>
    </div>
  )
}
