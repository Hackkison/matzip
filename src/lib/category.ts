// 카테고리별 색상 매핑
export const CATEGORY_STYLE: Record<string, { bg: string; text: string }> = {
  '한식':   { bg: 'bg-orange-100', text: 'text-orange-600' },
  '중식':   { bg: 'bg-red-100',    text: 'text-red-600' },
  '일식':   { bg: 'bg-blue-100',   text: 'text-blue-600' },
  '양식':   { bg: 'bg-purple-100', text: 'text-purple-600' },
  '디저트': { bg: 'bg-pink-100',   text: 'text-pink-600' },
  '기타':   { bg: 'bg-zinc-100',   text: 'text-zinc-500' },
}

export function getCategoryStyle(category: string) {
  return CATEGORY_STYLE[category] ?? CATEGORY_STYLE['기타']
}
