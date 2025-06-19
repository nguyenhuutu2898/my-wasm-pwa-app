// middleware.js
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

export async function middleware(req: any) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const { pathname } = req.nextUrl;

    // 1. Nếu người dùng đã đăng nhập (có token)
    if (token) {
        // Chuyển hướng người dùng đã đăng nhập ra khỏi trang đăng nhập/đăng ký
        // nếu họ cố gắng truy cập chúng (ví dụ: /login, /register, hoặc trang signIn mặc định của NextAuth)
        if (pathname === '/login' || pathname.startsWith('/api/auth/signin') || pathname.startsWith('/api/auth/register')) {
            return NextResponse.redirect(new URL('/', req.url)); // Chuyển về trang chủ
        }
        // Cho phép người dùng đã đăng nhập truy cập tất cả các route khác
        return NextResponse.next();
    }

    // 2. Nếu người dùng CHƯA đăng nhập (không có token)
    // Các route cần bảo vệ (thuộc nhóm (auth))
    if (pathname.startsWith('/auth')) { // hoặc nếu bạn muốn chính xác hơn: pathname.startsWith('/(auth)')
        // Chuyển hướng người dùng chưa đăng nhập đến trang đăng nhập
        const url = new URL('/login', req.url); // <-- URL của trang đăng nhập của bạn
        // Thêm query parameter để sau khi login xong có thể redirect lại trang cũ
        url.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(url);
    }

    // Cho phép người dùng chưa đăng nhập truy cập trang chủ, các trang công khai (no-auth)
    // và các API routes của NextAuth (như /api/auth/signin, /api/auth/callback/google)
    return NextResponse.next();
}

// Cấu hình matcher để middleware chỉ chạy trên các đường dẫn cụ thể
// Điều này rất quan trọng để tránh chạy middleware trên các tài nguyên tĩnh hoặc các route không cần thiết
export const config = {
    matcher: [
        // Bảo vệ các route trong nhóm (auth)
        '/auth/:path*', // Bảo vệ mọi thứ bên trong /auth/
        // Hoặc nếu bạn muốn chính xác theo route group: '/(auth)/:path*'
        // Các route công khai cần xử lý redirect cho người đã login (nếu có)
        '/login',
        // Đảm bảo middleware không chạy trên các API routes của NextAuth
        // (nhưng nếu basePath không được cấu hình đúng, nó có thể ảnh hưởng)
        // Các route này cần cho quá trình login/logout hoạt động
        '/api/auth/:path*',
    ],
};