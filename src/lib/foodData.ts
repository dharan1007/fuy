
export interface GenericFood {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    category: string;
    emoji: string;
}

export const GENERIC_FOODS: GenericFood[] = [
    // Fruits
    { name: "Apple (Medium)", calories: 95, protein: 0, carbs: 25, fats: 0, category: "Fruits", emoji: "🍎" },
    { name: "Banana (Medium)", calories: 105, protein: 1, carbs: 27, fats: 0, category: "Fruits", emoji: "🍌" },
    { name: "Orange", calories: 62, protein: 1, carbs: 15, fats: 0, category: "Fruits", emoji: "🍊" },
    { name: "Blueberries (1 cup)", calories: 84, protein: 1, carbs: 21, fats: 0, category: "Fruits", emoji: "🫐" },
    { name: "Strawberries (1 cup)", calories: 49, protein: 1, carbs: 12, fats: 0, category: "Fruits", emoji: "🍓" },
    { name: "Avocado (Half)", calories: 160, protein: 2, carbs: 9, fats: 15, category: "Fruits", emoji: "🥑" },
    { name: "Grapes (1 cup)", calories: 62, protein: 1, carbs: 16, fats: 0, category: "Fruits", emoji: "🍇" },
    { name: "Watermelon (1 cup)", calories: 46, protein: 1, carbs: 12, fats: 0, category: "Fruits", emoji: "🍉" },

    // Vegetables
    { name: "Broccoli (1 cup)", calories: 31, protein: 3, carbs: 6, fats: 0, category: "Vegetables", emoji: "🥦" },
    { name: "Spinach (1 cup raw)", calories: 7, protein: 1, carbs: 1, fats: 0, category: "Vegetables", emoji: "🥬" },
    { name: "Carrot (Medium)", calories: 25, protein: 1, carbs: 6, fats: 0, category: "Vegetables", emoji: "🥕" },
    { name: "Mixed Salad", calories: 20, protein: 1, carbs: 4, fats: 0, category: "Vegetables", emoji: "🥗" },
    { name: "Sweet Potato (Medium)", calories: 112, protein: 2, carbs: 26, fats: 0, category: "Vegetables", emoji: "🍠" },
    { name: "Cucumber (Half)", calories: 20, protein: 1, carbs: 4, fats: 0, category: "Vegetables", emoji: "🥒" },

    // Grains & Carbs
    { name: "Oats (1/2 cup dry)", calories: 150, protein: 5, carbs: 27, fats: 3, category: "Grains", emoji: "🌾" },
    { name: "White Rice (1 cup cooked)", calories: 205, protein: 4, carbs: 45, fats: 0, category: "Grains", emoji: "🍚" },
    { name: "Brown Rice (1 cup cooked)", calories: 216, protein: 5, carbs: 45, fats: 2, category: "Grains", emoji: "🌾" },
    { name: "Quinoa (1 cup cooked)", calories: 222, protein: 8, carbs: 39, fats: 4, category: "Grains", emoji: "🥣" },
    { name: "Bread (1 slice)", calories: 80, protein: 3, carbs: 15, fats: 1, category: "Grains", emoji: "🍞" },
    { name: "Pasta (1 cup cooked)", calories: 220, protein: 8, carbs: 43, fats: 1, category: "Grains", emoji: "🍝" },

    // Proteins
    { name: "Chicken Breast (100g)", calories: 165, protein: 31, carbs: 0, fats: 4, category: "Proteins", emoji: "🍗" },
    { name: "Egg (Large)", calories: 72, protein: 6, carbs: 0, fats: 5, category: "Proteins", emoji: "🥚" },
    { name: "Salmon (100g)", calories: 208, protein: 20, carbs: 0, fats: 13, category: "Proteins", emoji: "🐟" },
    { name: "Tuna (Can)", calories: 130, protein: 29, carbs: 0, fats: 1, category: "Proteins", emoji: "🐟" },
    { name: "Tofu (100g)", calories: 76, protein: 8, carbs: 2, fats: 5, category: "Proteins", emoji: "🧊" },
    { name: "Whey Protein (1 scoop)", calories: 120, protein: 24, carbs: 3, fats: 1, category: "Proteins", emoji: "💪" },
    { name: "Greek Yogurt (1 cup)", calories: 130, protein: 23, carbs: 9, fats: 0, category: "Proteins", emoji: "🥣" },

    // Snacks & Others
    { name: "Almonds (1 oz)", calories: 164, protein: 6, carbs: 6, fats: 14, category: "Snacks", emoji: "🥜" },
    { name: "Peanut Butter (1 tbsp)", calories: 95, protein: 4, carbs: 3, fats: 8, category: "Snacks", emoji: "🥜" },
    { name: "Dark Chocolate (1 oz)", calories: 170, protein: 2, carbs: 13, fats: 12, category: "Snacks", emoji: "🍫" },
    { name: "Milk (1 cup)", calories: 103, protein: 8, carbs: 12, fats: 2, category: "Drinks", emoji: "🥛" },
    { name: "Coffee (Black)", calories: 2, protein: 0, carbs: 0, fats: 0, category: "Drinks", emoji: "☕" },
];
