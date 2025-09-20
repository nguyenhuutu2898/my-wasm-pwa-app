import Link from "next/link"
import { getServerSession } from "next-auth"

import { authOptions } from "../api/auth/[...nextauth]/auth-options"

type SheetFile = {
  id: string
  name: string
  owners?: Array<{ displayName?: string }>
  modifiedTime?: string
}

export default async function GoogleSheetPage() {
  const session: any = await getServerSession(authOptions)

  if (!session?.accessToken) {
    return (
      <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold text-slate-800">Yêu cầu đăng nhập</h1>
        <p className="max-w-md text-sm text-slate-500">
          Bạn cần đăng nhập Google để xem và chỉnh sửa các bảng tính được cấp quyền.
          Nhấn "Đăng nhập Google" ở góc phải để tiếp tục.
        </p>
      </section>
    )
  }

  const response = await fetch(
    "https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id,name,owners(displayName),modifiedTime)",
    {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      next: { revalidate: 60 },
    }
  )

  if (!response.ok) {
    return (
      <section className="mx-auto w-full max-w-4xl px-4 py-16">
        <div className="rounded-xl border border-red-200 bg-red-50/80 p-6 text-red-700">
          <h1 className="text-lg font-semibold">Không thể tải danh sách sheet</h1>
          <p className="mt-2 text-sm">
            Hãy đảm bảo token Google của bạn còn hiệu lực và bạn có quyền truy cập Drive.
          </p>
        </div>
      </section>
    )
  }

  const sheetList = await response.json()
  const sheets: SheetFile[] = sheetList?.files ?? []

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Google Sheets của bạn</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-500">
            Duyệt và chỉnh sửa trực tiếp các sheet được chia sẻ với bạn. Chọn một bảng tính để xem dữ liệu chi tiết.
          </p>
        </div>
        <Link
          href="https://docs.google.com/spreadsheets/u/0/"
          target="_blank"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500"
        >
          + Tạo sheet mới trên Google
        </Link>
      </div>

      {sheets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-700">Chưa có bảng tính nào</h2>
          <p className="mt-2 text-sm text-slate-500">
            Tạo sheet mới trên Google hoặc yêu cầu quyền truy cập để thấy danh sách hiển thị tại đây.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sheets.map((sheet) => (
            <Link
              key={sheet.id}
              href={`/google-sheet/${sheet.id}`}
              className="group relative flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg"
            >
              <div className="flex flex-col gap-2">
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                  📄 Google Sheet
                </span>
                <h2 className="text-lg font-semibold text-slate-800 group-hover:text-indigo-700">
                  {sheet.name || "Không có tiêu đề"}
                </h2>
                <p className="text-xs text-slate-500">
                  ID: <code className="select-all">{sheet.id}</code>
                </p>
              </div>
              <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Chủ sở hữu: {sheet.owners?.[0]?.displayName ?? "Không rõ"}
                </span>
                {sheet.modifiedTime && (
                  <time dateTime={sheet.modifiedTime}>
                    Cập nhật {new Date(sheet.modifiedTime).toLocaleDateString("vi-VN")}
                  </time>
                )}
              </div>
              <span className="absolute right-4 top-4 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 opacity-0 transition group-hover:opacity-100">
                Mở sheet
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  fill="none"
                  className="h-4 w-4"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      )}

      <details className="mt-10 rounded-2xl border border-slate-200 bg-white/70 p-5 text-sm text-slate-600">
        <summary className="cursor-pointer font-semibold text-slate-700">
          Xem phản hồi JSON từ Google Drive
        </summary>
        <pre className="mt-4 max-h-80 overflow-auto rounded-lg bg-slate-900/90 p-4 text-xs text-slate-100">
          {JSON.stringify(sheetList, null, 2)}
        </pre>
      </details>
    </div>
  )
}
