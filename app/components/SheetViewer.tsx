"use client";

import { useEffect, useState } from "react";

interface Props {
  sheetId: string;
  tabNames: string[];
  accessToken: string;
}

const detectFieldTypeFromCell = (cell: any): string => {
  if (!cell || !cell.effectiveValue) return "text";
  if ("numberValue" in cell.effectiveValue) return "number";
  if ("boolValue" in cell.effectiveValue) return "boolean";
  if ("stringValue" in cell.effectiveValue) {
    const val = cell.effectiveValue.stringValue;
    if (/^\d{4}-\d{2}-\d{2}/.test(val)) return "date";
    return "text";
  }
  return "text";
};

const SheetViewer = ({ sheetId, tabNames, accessToken }: Props) => {
  const [selectedTab, setSelectedTab] = useState(tabNames[0] || "");
  const [data, setData] = useState<string[][]>([]);
  const [gridMeta, setGridMeta] = useState<any[][]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState<string[] | null>(null);
  const [editRow, setEditRow] = useState<string[] | null>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

  const fetchSheetData = async (tab: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?includeGridData=true&ranges=${encodeURIComponent(
          tab
        )}!A1:E50`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const json = await res.json();

      const values = json.sheets?.[0]?.data?.[0]?.rowData || [];
      const tableData: string[][] = values.map((row: any) =>
        (row.values || []).map((cell: any) => cell.formattedValue || "")
      );
      const metaData: any[][] = values.map((row: any) =>
        (row.values || []).map((cell: any) => ({
          isFormula: !!cell.userEnteredValue?.formulaValue,
          options:
            cell.dataValidation?.condition?.type === "ONE_OF_LIST"
              ? cell.dataValidation.condition.values?.map(
                  (v: any) => v.userEnteredValue
                ) || []
              : null,
          effectiveValue: cell.effectiveValue || null,
        }))
      );

      setData(tableData);
      setGridMeta(metaData);
    } catch (err) {
      console.error(err);
      setData([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedTab) {
      fetchSheetData(selectedTab);
    }
  }, [selectedTab]);

  const handleSave = async () => {
    const hasChanges = selectedRow?.some(
      (value, idx) => value !== editRow?.[idx]
    );

    if (!hasChanges) {
      alert("Không có thay đổi nào để lưu.");
      setSelectedRow(null);
      setEditRow(null);
      return;
    }

    try {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${selectedTab}!A${selectedRowIndex}:E${selectedRowIndex}?valueInputOption=USER_ENTERED`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            range: `${selectedTab}!A${selectedRowIndex}:E${selectedRowIndex}`,
            majorDimension: "ROWS",
            values: [editRow],
          }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        console.error("❌ Update failed:", errorData);
        alert("Lỗi khi cập nhật dữ liệu. Vui lòng kiểm tra quyền truy cập.");
        return;
      }

      await fetchSheetData(selectedTab);
    } catch (error) {
      console.error("Lỗi khi gửi dữ liệu:", error);
    } finally {
      setSelectedRow(null);
      setEditRow(null);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <label className="font-medium">🧾 Chọn sheet:</label>
        <select
          value={selectedTab}
          onChange={(e) => setSelectedTab(e.target.value)}
          className="ml-2 p-2 border rounded"
        >
          {tabNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500">Đang tải dữ liệu...</p>
      ) : data.length > 0 ? (
        <div className="overflow-auto border rounded">
          <table className="min-w-full table-auto text-sm text-left text-gray-700">
            <thead className="bg-gray-100 font-semibold">
              <tr>
                {data[0]?.map((header, idx) => (
                  <th key={idx} className="px-4 py-2 border-b">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(1).map((row, rIdx) => (
                <tr
                  onClick={() => {
                    setSelectedRow(row);
                    setEditRow([...row]);
                    setSelectedRowIndex(rIdx + 2);
                  }}
                  key={rIdx}
                  className="hover:bg-gray-100 cursor-pointer"
                >
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-4 py-2 border-b">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500">Không có dữ liệu trong sheet này.</p>
      )}

      {selectedRow && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white text-black rounded-md p-6 shadow-lg max-w-lg w-full relative">
            <h2 className="text-lg font-semibold mb-4">
              📝 Chi tiết dòng đã chọn
            </h2>
            <form className="space-y-4 text-sm">
              {data[0].map((col, idx) => {
                const cellMeta = gridMeta[selectedRowIndex! - 2]?.[idx] || {};
                const isFormulaCell = cellMeta.isFormula;
                const options = cellMeta.options;
                const fieldType = detectFieldTypeFromCell(cellMeta);

                return (
                  <div key={idx}>
                    <label className="block font-medium mb-1">{col}</label>
                    {options ? (
                      <select
                        value={editRow?.[idx] ?? ""}
                        onChange={(e) =>
                          setEditRow((prev) =>
                            prev
                              ? [
                                  ...prev.slice(0, idx),
                                  e.target.value,
                                  ...prev.slice(idx + 1),
                                ]
                              : prev
                          )
                        }
                        disabled={isFormulaCell}
                        className="w-full border px-2 py-1 rounded"
                      >
                        {options.map((opt: string, i: number) => (
                          <option key={i} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : fieldType === "boolean" ? (
                      <select
                        value={editRow?.[idx] ?? ""}
                        onChange={(e) =>
                          setEditRow((prev) =>
                            prev
                              ? [
                                  ...prev.slice(0, idx),
                                  e.target.value,
                                  ...prev.slice(idx + 1),
                                ]
                              : prev
                          )
                        }
                        disabled={isFormulaCell}
                        className="w-full border px-2 py-1 rounded"
                      >
                        <option value="true">✅ True</option>
                        <option value="false">❌ False</option>
                      </select>
                    ) : fieldType === "date" ? (
                      <input
                        type="date"
                        value={editRow?.[idx]?.substring(0, 10) ?? ""}
                        onChange={(e) =>
                          setEditRow((prev) =>
                            prev
                              ? [
                                  ...prev.slice(0, idx),
                                  e.target.value,
                                  ...prev.slice(idx + 1),
                                ]
                              : prev
                          )
                        }
                        readOnly={isFormulaCell}
                        className={`w-full border px-2 py-1 rounded ${
                          editRow?.[idx] !== selectedRow?.[idx]
                            ? "bg-yellow-50 border-yellow-400"
                            : ""
                        } ${
                          isFormulaCell
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : ""
                        }`}
                      />
                    ) : (
                      <input
                        type={fieldType}
                        value={editRow?.[idx] ?? ""}
                        onChange={(e) =>
                          setEditRow((prev) =>
                            prev
                              ? [
                                  ...prev.slice(0, idx),
                                  e.target.value,
                                  ...prev.slice(idx + 1),
                                ]
                              : prev
                          )
                        }
                        readOnly={isFormulaCell}
                        className={`w-full border px-2 py-1 rounded ${
                          editRow?.[idx] !== selectedRow?.[idx]
                            ? "bg-yellow-50 border-yellow-400"
                            : ""
                        } ${
                          isFormulaCell
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : ""
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </form>
            <div className="flex justify-end mt-4 gap-2">
              <button
                onClick={handleSave}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Lưu thay đổi
              </button>
              <button
                onClick={() => {
                  setSelectedRow(null);
                  setEditRow(null);
                }}
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SheetViewer;
