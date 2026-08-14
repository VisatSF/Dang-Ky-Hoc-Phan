import uniqBy from 'lodash/uniqBy';
import { Buoi, ClassModel } from 'types';
import { TTrungTkb } from './views/2XepLop/TrungTkbDialog';
import { isProd } from '.';

export function uniqMaLop(classes: ClassModel[]): ClassModel[] {
  return uniqBy(classes, 'MaLop'); // Có nhiều lớp học nhiều buổi 1 tuần, xuất hiện nhiều lần, nhưng chỉ nên cộng 1 lần
}

export function calcTongSoTC(classes: ClassModel[]) {
  const { kept } = findOverlapedClasses(classes);
  const unique = uniqMaLop(kept);
  return unique.reduce((acc, cur) => acc + cur.SoTc, 0);
}

export function getTongSoTcJudgement(tongSoTC: number) {
  const text =
    tongSoTC < 14
      ? 'Chưa đạt số TC quy định: 14'
      : tongSoTC > 24
      ? 'Vượt quá số TC quy định: 24'
      : 'Thỏa mãn số TC quy định 14-24';
  const isOk = tongSoTC >= 14 && tongSoTC <= 24;
  return {
    isOk,
    text,
  };
}

export function extractListMaLop(classes: ClassModel[]) {
  const unique = uniqMaLop(classes);
  return unique.map((it) => it.MaLop);
}

export const getDanhSachTiet = (tiet: ClassModel['Tiet']): string[] => {
  if (!tiet) return [];
  const tietStr = String(tiet).trim();
  if (tietStr === '*') return ['*'];
  if (tietStr.includes(',')) return tietStr.split(',').map((s) => s.trim());
  if (tietStr.includes('-')) {
    const [start, end] = tietStr.split('-').map(Number);
    if (!isNaN(start) && !isNaN(end)) {
      const res: string[] = [];
      for (let i = start; i <= end; i++) res.push(String(i));
      return res;
    }
  }

  // Common UIT multi-digit period strings
  if (tietStr === '678910') return ['6', '7', '8', '9', '10'];
  if (tietStr === '78910') return ['7', '8', '9', '10'];
  if (tietStr === '8910') return ['8', '9', '10'];
  if (tietStr === '910') return ['9', '10'];
  if (tietStr === '101112') return ['10', '11', '12'];
  if (tietStr === '111213') return ['11', '12', '13'];
  if (tietStr === '121314') return ['12', '13', '14'];
  if (tietStr === '1213') return ['12', '13'];
  if (tietStr === '131415') return ['13', '14', '15'];
  if (tietStr === '1314') return ['13', '14'];
  if (tietStr === '1415') return ['14', '15'];
  if (tietStr === '1011') return ['10', '11'];
  if (tietStr === '1112') return ['11', '12'];

  // Match period sequence ending with 10 (e.g. 678910, 78910, 8910, 910)
  const match10 = tietStr.match(/^([1-9]+)(10)$/);
  if (match10) {
    const singleDigits = match10[1].split('');
    return [...singleDigits, '10'];
  }

  return tietStr.split('');
};

export const getBuoiFromTiet = (tiet: ClassModel['Tiet']): Buoi => {
  const danhSach = getDanhSachTiet(tiet);
  if (danhSach.includes('*') || danhSach.length === 0) return Buoi.N_A;
  if (danhSach.some((t) => ['11', '12', '13', '14', '15'].includes(t))) return Buoi.Toi;
  if (danhSach.some((t) => ['6', '7', '8', '9', '10'].includes(t))) return Buoi.Chieu;
  if (danhSach.some((t) => ['1', '2', '3', '4', '5'].includes(t))) return Buoi.Sang;
  return Buoi.N_A;
};

/**
 * "*": Không lên trường
 * 2-1, 2-2, 2-3: Thứ 2, tiết 1,2,3
 * 7-11, 7-12, 7-13: Thứ 7, tiết 11,12,13
 */
type ValidTimeSlot = `${string}-${string}`;
type TimeSlots = '*' | ValidTimeSlot[];
const getTimeSlots = ({ Thu, Tiet }: ClassModel): TimeSlots => {
  if (Thu === '*') return '*';
  return getDanhSachTiet(Tiet).map((tiet): ValidTimeSlot => `${Thu}-${tiet}`);
};

const isTimeSlotsOverlap = (timeSlotsA: TimeSlots, timeSlotsB: TimeSlots) => {
  if (timeSlotsA === '*' || timeSlotsB === '*') return false;
  return timeSlotsA.some((slotA) => timeSlotsB.includes(slotA));
};

export const hasOverlapSchedule = (classAs: ClassModel[], classB: ClassModel) => {
  const classBTimeSlots = getTimeSlots(classB);
  return classAs.some((classA) => {
    if (isSameAgGridRowId(classA, classB)) return false;
    const classATimeSlots = getTimeSlots(classA);
    return isTimeSlotsOverlap(classATimeSlots, classBTimeSlots);
  });
};

// Thường thì MaLop alone is enough because most of the classes only appear once a week or once every 2 weeks, nhưng mà có thể có môn Anh Văn học 1 tuần tới 2 buổi, nên cần có thêm Thu và Tiet
// TODO: maybe use STT?
export const getAgGridRowId = (classModel: ClassModel): string => {
  return classModel.MaLop + classModel.Thu + classModel.Tiet;
};

export const isSameAgGridRowId = (class1: ClassModel, class2: ClassModel) => {
  return getAgGridRowId(class1) === getAgGridRowId(class2);
};

export const findOverlapedClasses = (
  /** the first elements in the array will have higher priority, it's OK to have duplicated classes */
  classes: ClassModel[],
): { kept: ClassModel[]; redundant: TTrungTkb[] } => {
  const kept: ClassModel[] = [];
  const redundant: TTrungTkb[] = [];

  const findExistingOverlap = (newClass: ClassModel) => {
    const newClassTimeSlots = getTimeSlots(newClass);
    return kept.find((existingClass) => {
      const existingClassTimeSlots = getTimeSlots(existingClass);
      return isTimeSlotsOverlap(existingClassTimeSlots, newClassTimeSlots);
    });
  };

  const processedAgGridRowIds = new Set<string>();
  classes.forEach((addingClass) => {
    const agGridRowId = getAgGridRowId(addingClass);
    if (processedAgGridRowIds.has(agGridRowId)) return;

    processedAgGridRowIds.add(agGridRowId);
    const existingClassOverlapped = findExistingOverlap(addingClass);
    // TODO: refactor the mess below
    const existingRedundant =
      existingClassOverlapped && redundant.find((it) => isSameAgGridRowId(it.existing, existingClassOverlapped));
    if (existingRedundant) {
      existingRedundant.new.push(addingClass);
    } else if (existingClassOverlapped) {
      redundant.push({
        existing: existingClassOverlapped,
        new: [addingClass],
      });
    } else {
      kept.push(addingClass);
    }
  });

  return { kept, redundant };
};

export const log = (...args: any[]) => {
  (window.__DEBUG__ || !isProd) && console.log(...args);
};
