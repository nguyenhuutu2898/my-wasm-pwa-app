'use client'

import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

const LoginPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/';
    const { data: session, status }: any = useSession();

    if (status === "loading") {
        return <p>Đang tải session...</p>;
    }

    if (session) {
        return (
            <div>
                <p>Chào mừng, {session.user.name}!</p>
                <p>Email: {session.user.email}</p>
                {session.accessToken && (
                    <p>Access Token: {session.accessToken.substring(0, 10)}...</p>
                )}
                <button onClick={() => signOut()}>Đăng xuất</button>
            </div>
        );
    }
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Đăng nhập vào tài khoản</h2>

                {/* <button
                    className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg shadow-sm hover:bg-gray-50 transition">
                    <img
                        src="https://www.svgrepo.com/show/475656/google-color.svg"
                        alt="Google"
                        className="w-5 h-5"
                    />
                    <span>Đăng nhập với Google</span>
                </button>

                <div className="flex items-center my-6">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="mx-4 text-gray-400 text-sm">hoặc</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                </div> */}

                <button
                    onClick={() => signIn('google', { callbackUrl: callbackUrl })}
                    className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg shadow-sm hover:bg-gray-50 transition"
                >
                    <img
                        src="https://www.svgrepo.com/show/475656/google-color.svg"
                        alt="Google"
                        className="w-5 h-5"
                    />
                    <span>Đăng nhập với Google</span>
                </button>

                <p className="mt-4 text-center text-sm text-gray-500">
                    Chưa có tài khoản? <a href="#" className="text-blue-600 hover:underline">Đăng ký</a>
                </p>
            </div>
        </div>

    )
}

export default LoginPage;   