// Comprehensive Food Database with Nutritional Information
export interface FoodItem {
  id: string;
  name: string;
  category: "protein" | "carbs" | "fats" | "vegetables" | "fruits" | "dairy" | "grains" | "other";
  servingSize: string; // e.g., "100g", "1 cup", "1 piece"
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fats: number; // grams
  fiber: number; // grams
  iron: number; // mg
  calcium: number; // mg
  magnesium: number; // mg
  potassium: number; // mg
  zinc: number; // mg
  vitaminA: number; // IU
  vitaminC: number; // mg
  vitaminD: number; // IU
  vitaminE: number; // mg
  vitaminK: number; // mcg
  folate: number; // mcg
  b12: number; // mcg
  b6: number; // mg
  sodium: number; // mg
}

// Predefined food database
export const foodDatabase: FoodItem[] = [
  // Proteins
  {
    id: "chicken-breast",
    name: "Chicken Breast (skinless)",
    category: "protein",
    servingSize: "100g",
    calories: 165,
    protein: 31,
    carbs: 0,
    fats: 3.6,
    fiber: 0,
    iron: 0.9,
    calcium: 15,
    magnesium: 26,
    potassium: 220,
    zinc: 0.9,
    vitaminA: 0,
    vitaminC: 0,
    vitaminD: 0,
    vitaminE: 0.3,
    vitaminK: 0,
    folate: 4,
    b12: 0.3,
    b6: 0.9,
    sodium: 75,
  },
  {
    id: "salmon",
    name: "Salmon (wild, cooked)",
    category: "protein",
    servingSize: "100g",
    calories: 206,
    protein: 22,
    carbs: 0,
    fats: 12,
    fiber: 0,
    iron: 0.8,
    calcium: 13,
    magnesium: 27,
    potassium: 363,
    zinc: 0.7,
    vitaminA: 150,
    vitaminC: 0,
    vitaminD: 570,
    vitaminE: 0.5,
    vitaminK: 0,
    folate: 14,
    b12: 3.2,
    b6: 0.6,
    sodium: 44,
  },
  {
    id: "egg",
    name: "Egg (large, whole)",
    category: "protein",
    servingSize: "1 piece",
    calories: 78,
    protein: 6.3,
    carbs: 0.6,
    fats: 5.3,
    fiber: 0,
    iron: 1.8,
    calcium: 28,
    magnesium: 6,
    potassium: 69,
    zinc: 0.6,
    vitaminA: 540,
    vitaminC: 0,
    vitaminD: 110,
    vitaminE: 0.5,
    vitaminK: 0.3,
    folate: 22,
    b12: 0.6,
    b6: 0.1,
    sodium: 62,
  },
  {
    id: "beef-lean",
    name: "Beef (lean ground, cooked)",
    category: "protein",
    servingSize: "100g",
    calories: 215,
    protein: 23,
    carbs: 0,
    fats: 13,
    fiber: 0,
    iron: 2.6,
    calcium: 11,
    magnesium: 20,
    potassium: 315,
    zinc: 6.4,
    vitaminA: 0,
    vitaminC: 0,
    vitaminD: 0,
    vitaminE: 0.3,
    vitaminK: 0,
    folate: 7,
    b12: 2.4,
    b6: 0.5,
    sodium: 65,
  },
  // Carbs
  {
    id: "brown-rice",
    name: "Brown Rice (cooked)",
    category: "grains",
    servingSize: "100g",
    calories: 111,
    protein: 2.6,
    carbs: 23,
    fats: 0.9,
    fiber: 1.8,
    iron: 0.8,
    calcium: 20,
    magnesium: 84,
    potassium: 86,
    zinc: 1.3,
    vitaminA: 0,
    vitaminC: 0,
    vitaminD: 0,
    vitaminE: 0.6,
    vitaminK: 1.9,
    folate: 8,
    b12: 0,
    b6: 0.15,
    sodium: 4,
  },
  {
    id: "sweet-potato",
    name: "Sweet Potato (baked)",
    category: "vegetables",
    servingSize: "100g",
    calories: 86,
    protein: 1.6,
    carbs: 20,
    fats: 0.1,
    fiber: 3,
    iron: 0.7,
    calcium: 30,
    magnesium: 25,
    potassium: 337,
    zinc: 0.3,
    vitaminA: 9610,
    vitaminC: 2.4,
    vitaminD: 0,
    vitaminE: 0.3,
    vitaminK: 1.9,
    folate: 11,
    b12: 0,
    b6: 0.27,
    sodium: 55,
  },
  {
    id: "oats",
    name: "Oats (dry)",
    category: "grains",
    servingSize: "40g",
    calories: 150,
    protein: 5,
    carbs: 27,
    fats: 3,
    fiber: 4,
    iron: 4.3,
    calcium: 54,
    magnesium: 177,
    potassium: 429,
    zinc: 4,
    vitaminA: 0,
    vitaminC: 0,
    vitaminD: 0,
    vitaminE: 0.6,
    vitaminK: 0,
    folate: 11,
    b12: 0,
    b6: 0.1,
    sodium: 4,
  },
  // Vegetables
  {
    id: "broccoli",
    name: "Broccoli (raw)",
    category: "vegetables",
    servingSize: "100g",
    calories: 34,
    protein: 2.8,
    carbs: 7,
    fats: 0.4,
    fiber: 2.4,
    iron: 0.7,
    calcium: 47,
    magnesium: 21,
    potassium: 316,
    zinc: 0.4,
    vitaminA: 1508,
    vitaminC: 89,
    vitaminD: 0,
    vitaminE: 0.8,
    vitaminK: 102,
    folate: 63,
    b12: 0,
    b6: 0.18,
    sodium: 64,
  },
  {
    id: "spinach",
    name: "Spinach (raw)",
    category: "vegetables",
    servingSize: "100g",
    calories: 23,
    protein: 2.7,
    carbs: 3.6,
    fats: 0.4,
    fiber: 2.2,
    iron: 2.7,
    calcium: 99,
    magnesium: 79,
    potassium: 558,
    zinc: 0.5,
    vitaminA: 4694,
    vitaminC: 8.4,
    vitaminD: 0,
    vitaminE: 2,
    vitaminK: 145,
    folate: 58,
    b12: 0,
    b6: 0.2,
    sodium: 79,
  },
  // Fruits
  {
    id: "banana",
    name: "Banana (medium)",
    category: "fruits",
    servingSize: "1 piece (118g)",
    calories: 105,
    protein: 1.3,
    carbs: 27,
    fats: 0.3,
    fiber: 3.1,
    iron: 0.3,
    calcium: 5,
    magnesium: 32,
    potassium: 422,
    zinc: 0.2,
    vitaminA: 64,
    vitaminC: 8.7,
    vitaminD: 0,
    vitaminE: 0.1,
    vitaminK: 0.6,
    folate: 24,
    b12: 0,
    b6: 0.43,
    sodium: 1,
  },
  // Dairy
  {
    id: "greek-yogurt",
    name: "Greek Yogurt (plain, nonfat)",
    category: "dairy",
    servingSize: "100g",
    calories: 59,
    protein: 10,
    carbs: 3.3,
    fats: 0.4,
    fiber: 0,
    iron: 0,
    calcium: 127,
    magnesium: 16,
    potassium: 143,
    zinc: 0.2,
    vitaminA: 14,
    vitaminC: 0.2,
    vitaminD: 0,
    vitaminE: 0,
    vitaminK: 0,
    folate: 4,
    b12: 0.4,
    b6: 0.07,
    sodium: 76,
  },
];

/**
 * Parse food input and calculate nutritional content
 */
export function parseFoodInput(input: string): {
  food: FoodItem | null;
  quantity: number;
  unit: string;
} | null {
  // Try to find a matching food item
  const trimmed = input.toLowerCase().trim();
  const food = foodDatabase.find(
    (f) =>
      f.name.toLowerCase().includes(trimmed) ||
      trimmed.includes(f.name.toLowerCase())
  );

  if (!food) return null;

  // Extract quantity if present (e.g., "2 eggs", "100g chicken")
  const quantityMatch = input.match(/(\d+(?:\.\d+)?)\s*(g|kg|ml|l|cup|piece|slice)?/i);
  const quantity = quantityMatch ? parseFloat(quantityMatch[1]) : 1;
  const unit = quantityMatch?.[2] || food.servingSize;

  return { food, quantity, unit };
}

/**
 * Calculate nutritional values for serving
 */
export function calculateNutrition(
  food: FoodItem,
  quantity: number = 1
): Omit<FoodItem, "id" | "name" | "category" | "servingSize"> {
  const multiplier = quantity;

  return {
    calories: Math.round(food.calories * multiplier),
    protein: Math.round(food.protein * multiplier * 10) / 10,
    carbs: Math.round(food.carbs * multiplier * 10) / 10,
    fats: Math.round(food.fats * multiplier * 10) / 10,
    fiber: Math.round(food.fiber * multiplier * 10) / 10,
    iron: Math.round(food.iron * multiplier * 100) / 100,
    calcium: Math.round(food.calcium * multiplier),
    magnesium: Math.round(food.magnesium * multiplier),
    potassium: Math.round(food.potassium * multiplier),
    zinc: Math.round(food.zinc * multiplier * 100) / 100,
    vitaminA: Math.round(food.vitaminA * multiplier),
    vitaminC: Math.round(food.vitaminC * multiplier * 10) / 10,
    vitaminD: Math.round(food.vitaminD * multiplier),
    vitaminE: Math.round(food.vitaminE * multiplier * 10) / 10,
    vitaminK: Math.round(food.vitaminK * multiplier * 10) / 10,
    folate: Math.round(food.folate * multiplier),
    b12: Math.round(food.b12 * multiplier * 100) / 100,
    b6: Math.round(food.b6 * multiplier * 100) / 100,
    sodium: Math.round(food.sodium * multiplier),
  };
}
