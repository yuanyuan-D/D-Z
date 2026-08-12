import type { Dish } from '../types'

export const CATEGORIES = ['热菜', '凉菜', '主食', '汤品', '甜品'] as const

export const PRESET_IMAGES = [
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&h=300&fit=crop',
]

export const SEED_DISHES: Dish[] = [
  {
    id: 'd1',
    name: '番茄炒蛋',
    description: '家常必备，酸甜开胃，妈妈的味道',
    price: 12,
    category: '热菜',
    image: PRESET_IMAGES[0],
  },
  {
    id: 'd2',
    name: '红烧排骨',
    description: '慢火炖煮，酱香浓郁，软烂入味',
    price: 28,
    category: '热菜',
    image: PRESET_IMAGES[5],
  },
  {
    id: 'd3',
    name: '蒜蓉西兰花',
    description: '清脆爽口，蒜香四溢',
    price: 14,
    category: '热菜',
    image: PRESET_IMAGES[2],
  },
  {
    id: 'd4',
    name: '凉拌黄瓜',
    description: '爽脆解腻，夏日首选',
    price: 8,
    category: '凉菜',
    image: PRESET_IMAGES[3],
  },
  {
    id: 'd5',
    name: '拍黄瓜',
    description: '蒜香辣椒油，一口清爽',
    price: 8,
    category: '凉菜',
    image: PRESET_IMAGES[7],
  },
  {
    id: 'd6',
    name: '米饭',
    description: '香软白米饭，配菜刚刚好',
    price: 2,
    category: '主食',
    image: PRESET_IMAGES[4],
  },
  {
    id: 'd7',
    name: '葱油拌面',
    description: '手工葱油，拌得满口香',
    price: 10,
    category: '主食',
    image: PRESET_IMAGES[1],
  },
  {
    id: 'd8',
    name: '番茄蛋花汤',
    description: '暖胃清淡，收尾必备',
    price: 8,
    category: '汤品',
    image: PRESET_IMAGES[6],
  },
  {
    id: 'd9',
    name: '银耳莲子羹',
    description: '温润甜美，饭后小确幸',
    price: 10,
    category: '甜品',
    image: PRESET_IMAGES[0],
  },
]
