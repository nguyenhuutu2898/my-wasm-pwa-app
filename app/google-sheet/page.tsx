import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/auth-options";
import Link from "next/link";

const GoogleSheetPage = async () => {
    const session: any = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
        return (
            <div className="p-4 text-red-500 font-semibold">
                Bạn chưa đăng nhập hoặc không có quyền truy cập.
            </div>
        );
    }

    const accessToken = session.accessToken;

    const res1 = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id,name)`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );
    const sheetList = await res1.json();


    return (
        <div className="p-4">
            <h1 className="text-xl font-bold mb-2">📄 Google Sheets</h1>

            <h2 className="text-md font-semibold mb-1">Danh sách sheets:</h2>
            <div className="mb-4 flex flex-col">
                {sheetList?.files?.map((f: any) => (
                    <Link href={`/google-sheet/${f.id}`} key={f.id}>
                        {f.name} – <code className="text-gray-600">{f.id}</code>
                    </Link>
                ))}
            </div>

        </div>
    );
};

export default GoogleSheetPage;
