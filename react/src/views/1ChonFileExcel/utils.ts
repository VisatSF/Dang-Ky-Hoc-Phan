import { ClassModelOriginal } from 'types';

export function arrayToTkbObject(array: any[]): ClassModelOriginal {
  // convert excel based date (1989-Dec-30) to Js based date (1970-Jan-01)
  function convertExcelDateToStringDate(excelDate) {
    if (excelDate == null) return '';
    // in Excel, based date is 1989-Dec-30: https://stackoverflow.com/questions/36378476/why-does-the-date-returns-31-12-1899-when-1-is-passed-to-it
    // @ts-ignore
    const offsetOfBases = new Date(0) - new Date(1899, 11, 31);
    const jsDate = new Date(excelDate * 24 * 60 * 60 * 1000 - offsetOfBases);
    return (
      jsDate.getFullYear() +
      '-' +
      (jsDate.getMonth() + 1).toString().padStart(2, '0') +
      '-' +
      jsDate.getDate().toString().padStart(2, '0')
    );
  }

  // Safe helpers: avoid NaN from parseInt(undefined) and "undefined" from String(undefined)
  const safeInt = (val: any, fallback = 0): number => {
    if (val == null) return fallback;
    const parsed = parseInt(val);
    return isNaN(parsed) ? fallback : parsed;
  };
  const safeStr = (val: any, fallback = ''): string => {
    if (val == null) return fallback;
    return String(val);
  };

  return {
    STT: array[0],
    MaMH: array[1] ?? '',
    MaLop: array[2] ?? '',
    TenMH: array[3] ?? '',
    MaGV: array[4],
    TenGV: array[5],
    SiSo: array[6] ?? '',
    SoTc: safeInt(array[7]),
    ThucHanh: safeInt(array[8]),
    HTGD: safeStr(array[9]),
    Thu: safeStr(array[10], '*'),
    Tiet: safeStr(array[11], '*'),
    CachTuan: safeStr(array[12]),
    PhongHoc: array[13],
    KhoaHoc: safeStr(array[14]),
    HocKy: safeStr(array[15]),
    NamHoc: safeStr(array[16]),
    HeDT: array[17] ?? '',
    KhoaQL: array[18] ?? '',
    NBD: typeof array[19] === 'string' ? array[19] : convertExcelDateToStringDate(array[19]),
    NKT: typeof array[20] === 'string' ? array[20] : convertExcelDateToStringDate(array[20]),
    GhiChu: array[21] ?? '',
    NgonNgu: array[22] ?? '',
  };
}

// from Date object to 'hh:mm dd/MM/yyyy' format
export function toDateTimeString(date: Date) {
  return (
    date.getHours().toString().padStart(2, '0') +
    ':' +
    date.getMinutes().toString().padStart(2, '0') +
    ' ' +
    date.getDate().toString().padStart(2, '0') +
    '/' +
    (date.getMonth() + 1).toString().padStart(2, '0') +
    '/' +
    date.getFullYear()
  );
}

// Format epoch timestamp to 'hh:mm dd/MM/yyyy' format
export function formatTimestampToString(timestamp: number): string {
  return toDateTimeString(new Date(timestamp));
}

// Get formatted lastUpdate string from dataExcel (backward compatible)
export function getLastUpdateString(dataExcel: { lastUpdate?: string; lastUpdateTimestamp?: number } | null): string | undefined {
  if (!dataExcel) return undefined;
  if (dataExcel.lastUpdateTimestamp !== undefined) {
    return formatTimestampToString(dataExcel.lastUpdateTimestamp);
  }
  return dataExcel.lastUpdate;
}

// copied from: https://github.com/SheetJS/sheetjs/blob/master/demos/react/sheetjs.jsx#L134-L136
export const sheetJSFT = [
  '.xlsx',
  '.xlsb',
  '.xlsm',
  '.xls',
  // '.xml',
  '.csv',
  // '.txt',
  // '.ods',
  // '.fods',
  // '.uos',
  // '.sylk',
  // '.dif',
  // '.dbf',
  // '.prn',
  // '.qpw',
  // '.123',
  // '.wb*',
  // '.wq*',
  // '.html',
  // '.htm',
].join(',');
