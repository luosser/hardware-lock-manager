// public/js/export.js
// 這個文件用於處理資料匯出功能，特別是處理中文編碼問題

function exportToExcel(data, fileName, sheetName) {
    // 添加 BOM 以確保正確處理 UTF-8 編碼 (解決中文亂碼問題)
    const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    const EXCEL_EXTENSION = '.xlsx';
  
    // 使用 SheetJS 庫處理數據
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
  
    // 設置列寬 (根據中文字符寬度調整)
    const wscols = [
      { wch: 8 },   // ID
      { wch: 15 },  // 頻威智編號
      { wch: 15 },  // 硬體鎖編號
      { wch: 20 },  // 專案軟體
      { wch: 25 },  // 借用/售出對象
      { wch: 15 },  // 部門
      { wch: 10 },  // 狀態
      { wch: 30 },  // 備註
      { wch: 18 },  // 創建時間
      { wch: 18 }   // 更新時間
    ];
    ws['!cols'] = wscols;
  
    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(wb, ws, sheetName || '數據');
  
    // 將工作簿寫入檔案並下載
    XLSX.writeFile(wb, fileName);
  }
  
  // 匯出 CSV 文件 (備用方法，處理中文更好)
  function exportToCSV(data, fileName) {
    // 創建帶有 BOM 的 CSV
    let csv = '\uFEFF'; // UTF-8 的 BOM
  
    // 添加標題行
    const headers = Object.keys(data[0]);
    csv += headers.join(',') + '\r\n';
  
    // 添加數據行
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        // 處理包含逗號、引號或換行符的值
        if (value == null) return '';
        const valueStr = String(value);
        if (valueStr.includes(',') || valueStr.includes('"') || valueStr.includes('\n')) {
          return '"' + valueStr.replace(/"/g, '""') + '"';
        }
        return valueStr;
      });
      csv += values.join(',') + '\r\n';
    }
  
    // 創建 Blob 並下載
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }