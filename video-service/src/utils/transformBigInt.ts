export function transformBigInt(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(transformBigInt);
  }

  if (typeof obj === 'object' && obj !== null) {
    const newObj: any = {};
    for (const key in obj) {
      const value = obj[key];
      if (typeof value === 'bigint') {
        newObj[key] = Number(value); // hoặc `${value}` nếu bạn muốn giữ string
      } else if (typeof value === 'object') {
        newObj[key] = transformBigInt(value);
      } else {
        newObj[key] = value;
      }
    }
    return newObj;
  }

  return obj;
}

