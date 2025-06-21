import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";
import SheetViewer from "@/app/components/SheetViewer";
import { getServerSession } from "next-auth";

interface Props {
    params: { id: string };
}

const GoogleSheetDetailPage = async ({ params }: Props) => {
    const { id } = await params;
    const session: any = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
        return (
            <div className="p-4 text-red-600 font-semibold">
                Bạn chưa đăng nhập hoặc không có quyền truy cập.
            </div>
        );
    }

    try {

        const accessToken = session.accessToken;
        const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const data = await res.json();
        console.log('data', data)
        const sheetTabs = data.sheets?.map((s: any) => s.properties.title);
        console.log('sheetTabs', sheetTabs)
        return (
            <div className="p-4">
                <h1 className="text-xl font-bold mb-4">📄 Sheet title: {data?.properties?.title}</h1>
                <SheetViewer sheetId={id} tabNames={sheetTabs} accessToken={accessToken} />
            </div>
        );
    } catch (err) {
        return (
            <div className="p-4 text-red-500">
                ❌ Không thể tải dữ liệu từ Google Sheet ID: <code>{id}</code>
            </div>
        );
    }
};

export default GoogleSheetDetailPage;
