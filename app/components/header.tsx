"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";

export default function Header() {
    const { data: session, status } = useSession();

    return (
        <header className="flex justify-between items-center px-4 py-3 bg-black shadow-md">
            <Link href="/">
                <span className="font-bold text-lg text-blue-600 cursor-pointer">
                    My App
                </span>
            </Link>

            <div className="flex items-center gap-4">
                <Link href="/google-sheet">
                    <span className="text-sm text-blue-500 hover:underline cursor-pointer">
                        Google Sheets
                    </span>
                </Link>

                {status === "loading" ? (
                    <span className="text-gray-500">Loading...</span>
                ) : session ? (
                    <>
                        <span className="text-sm">👤 {session.user?.name}</span>
                        <button
                            onClick={() => signOut()}
                            className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                        >
                            Logout
                        </button>
                    </>
                ) : (
                    <button
                        onClick={() => signIn("google")}
                        className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    >
                        Login with Google
                    </button>
                )}
            </div>
        </header>
    );
}
