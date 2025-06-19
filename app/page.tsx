"use client";

import { useEffect, useState } from "react";
import { runWasmSum } from "../utils/wasm";

function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js');
      });
    }
  }, []);
  return null;
}


export default function Home() {
  const [numbers, setNumbers] = useState<number[]>([]);
  const [result, setResult] = useState<number | null>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n");
      const nums = lines
        .map((line) => parseInt(line.trim()))
        .filter((n) => !isNaN(n));
      setNumbers(nums);
      const sum = await runWasmSum(nums);
      setResult(sum);
    };
    reader.readAsText(file);
  };

  return (
    <main className="p-6"><ServiceWorkerRegister />
      <h1 className="text-2xl font-bold mb-4">WASM + PWA Demo</h1>

      <input
        type="file"
        accept=".txt,.csv"
        onChange={handleUpload}
        className="mb-4"
      />

      {result !== null && (
        <div className="mt-4 text-lg">
          Tổng các số: <strong>{result}</strong>
        </div>
      )}
    </main>
  );
}