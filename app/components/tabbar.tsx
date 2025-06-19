const Tabbar = () => {
    return (
        <div className="w-full bg-white border-t border-gray-200 fixed bottom-0 z-50 md:relative md:border-none md:py-4">
            <div className="max-w-md md:max-w-2xl mx-auto flex justify-around items-center">
                <button className="flex flex-col items-center text-blue-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2"
                        viewBox="0 0 24 24">
                        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" />
                    </svg>
                    <span className="text-xs mt-1">Trang chủ</span>
                </button>
                <button className="flex flex-col items-center text-gray-500 hover:text-blue-600 transition">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2"
                        viewBox="0 0 24 24">
                        <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M9 20H4v-2a3 3 0 015.356-1.857M12 4v4m0 0a4 4 0 110 8 4 4 0 010-8z" />
                    </svg>
                    <span className="text-xs mt-1">Hồ sơ</span>
                </button>
                <button className="flex flex-col items-center text-gray-500 hover:text-blue-600 transition">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2"
                        viewBox="0 0 24 24">
                        <path d="M3 8h18M3 16h18" />
                    </svg>
                    <span className="text-xs mt-1">Cài đặt</span>
                </button>
            </div>
        </div>

    )
}

export default Tabbar;