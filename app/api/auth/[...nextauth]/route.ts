// app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
    ],
    callbacks: {
        async jwt({ token, account }: any) {
            if (account) {
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;
            }
            return token;
        },
        async session({ session, token }: any) {
            session.accessToken = token.accessToken;
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
    basePath: "/api/auth", // Rất quan trọng cho App Router
    pages: {
        // Tùy chỉnh trang đăng nhập nếu bạn muốn, mặc định là /api/auth/signin
        signIn: '/login', // <-- Ví dụ: chuyển hướng đến trang /login của bạn
    }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };