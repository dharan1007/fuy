// Scientific Nutrition Calculator with Optimal Limits
export type FitnessGoal = "maintain" | "lose_slow" | "lose_moderate" | "lose_aggressive" | "bulk_lean" | "bulk_muscle" | "lean_muscle" | "athletic";
export type Gender = "male" | "female";

export interface NutritionRequirements {
  dailyCalories: number;
  protein: { grams: number; optimalRange: [number, number] };
  carbs: { grams: number; optimalRange: [number, number] };
  fats: { grams: number; optimalRange: [number, number] };
  fiber: { grams: number; optimalLimit: number };
  calcium: { mg: number; optimalLimit: number };
  iron: { mg: number; optimalLimit: number };
  magnesium: { mg: number; optimalLimit: number };
  potassium: { mg: number; optimalLimit: number };
  zinc: { mg: number; optimalLimit: number };
  vitaminA: { iu: number; optimalLimit: number };
  vitaminC: { mg: number; optimalLimit: number };
  vitaminD: { iu: number; optimalLimit: number };
  vitaminE: { mg: number; optimalLimit: number };
  vitaminK: { mcg: number; optimalLimit: number };
  folate: { mcg: number; optimalLimit: number };
  b12: { mcg: number; optimalLimit: number };
  b6: { mg: number; optimalLimit: number };
  sodium: { mg: number; optimalLimit: number };
}

/**
 * Calculate personalized nutrition requirements based on scientific guidelines
 * (Dietary Reference Intakes - DRI, ACSM, and WHO recommendations)
 */
export function calculateNutritionRequirements(
  tdee: number,
  goal: FitnessGoal,
  gender: Gender,
  age: number = 25
): NutritionRequirements {
  // Adjust TDEE based on goal
  let adjustedCalories = tdee;
  let proteinMultiplier = 1.6; // g/kg for general fitness

  switch (goal) {
    case "lose_slow":
      adjustedCalories = tdee - 250;
      proteinMultiplier = 2.0; // Higher protein for muscle preservation
      break;
    case "lose_moderate":
      adjustedCalories = tdee - 500;
      proteinMultiplier = 2.2;
      break;
    case "lose_aggressive":
      adjustedCalories = tdee - 750;
      proteinMultiplier = 2.4;
      break;
    case "bulk_muscle":
    case "bulk_lean":
      adjustedCalories = tdee + 300;
      proteinMultiplier = 1.8;
      break;
    case "athletic":
      adjustedCalories = tdee + 200;
      proteinMultiplier = 1.7;
      break;
    case "lean_muscle":
      proteinMultiplier = 2.0;
      break;
    default: // maintain
      proteinMultiplier = 1.6;
  }

  // Protein calculation (1.6-2.4 g/kg body weight for fitness)
  // Average person: 70kg, so 112-168g protein
  const proteinGrams = Math.round(70 * proteinMultiplier); // ~112-168g
  const proteinCalories = proteinGrams * 4;

  // Fat calculation (20-35% of calories, scientific recommendation)
  const fatCalories = adjustedCalories * 0.25;
  const fatGrams = Math.round(fatCalories / 9);

  // Carbs (remaining calories)
  const carbCalories = adjustedCalories - proteinCalories - fatCalories;
  const carbGrams = Math.round(carbCalories / 4);

  // Micronutrient requirements (DRI and ACSM guidelines)
  const isMale = gender === "male";

  return {
    dailyCalories: Math.round(adjustedCalories),
    protein: {
      grams: proteinGrams,
      optimalRange: [proteinGrams * 0.9, proteinGrams * 1.1],
    },
    carbs: {
      grams: carbGrams,
      optimalRange: [carbGrams * 0.9, carbGrams * 1.1],
    },
    fats: {
      grams: fatGrams,
      optimalRange: [fatGrams * 0.8, fatGrams * 1.2],
    },
    fiber: {
      grams: isMale ? 38 : 25, // DRI values
      optimalLimit: isMale ? 38 : 25,
    },
    calcium: {
      mg: age > 50 ? (isMale ? 1000 : 1200) : 1000, // mg/day
      optimalLimit: 2000, // UL
    },
    iron: {
      mg: isMale ? 8 : (age > 50 ? 8 : 18), // mg/day
      optimalLimit: 45, // UL
    },
    magnesium: {
      mg: isMale ? (age > 30 ? 420 : 400) : (age > 30 ? 320 : 310), // mg/day
      optimalLimit: 350, // UL (from supplements)
    },
    potassium: {
      mg: 3400, // mg/day
      optimalLimit: 3400,
    },
    zinc: {
      mg: isMale ? 11 : 8, // mg/day
      optimalLimit: isMale ? 40 : 35, // UL
    },
    vitaminA: {
      iu: isMale ? 3000 : 2333, // IU/day (mcg RAE * 3.33)
      optimalLimit: 10000, // IU/day for long-term
    },
    vitaminC: {
      mg: isMale ? 90 : 75, // mg/day
      optimalLimit: 2000, // UL
    },
    vitaminD: {
      iu: 600, // IU/day (15 mcg)
      optimalLimit: 4000, // IU/day
    },
    vitaminE: {
      mg: 15, // mg/day (alpha-tocopherol)
      optimalLimit: 1000, // UL
    },
    vitaminK: {
      mcg: isMale ? 120 : 90, // mcg/day
      optimalLimit: isMale ? 120 : 90,
    },
    folate: {
      mcg: 400, // mcg/day
      optimalLimit: 1000, // UL (from fortified foods/supplements)
    },
    b12: {
      mcg: 2.4, // mcg/day
      optimalLimit: 2.4,
    },
    b6: {
      mg: age > 50 ? (isMale ? 1.7 : 1.5) : (isMale ? 1.3 : 1.3), // mg/day
      optimalLimit: 100, // UL
    },
    sodium: {
      mg: 2300, // mg/day (adequate intake)
      optimalLimit: 2300, // Recommended upper limit
    },
  };
}

/**
 * Evaluate micronutrient status
 */
export function evaluateMicronutrient(
  current: number,
  requirement: NutritionRequirements,
  nutrient: keyof NutritionRequirements
): {
  status: "deficient" | "adequate" | "optimal" | "excess";
  percentage: number;
} {
  const req = requirement[nutrient] as any;
  const limit = req.optimalLimit || req.grams || req.mg || req.iu || req.mcg;

  const percentage = Math.round((current / limit) * 100);

  if (percentage < 70) return { status: "deficient", percentage };
  if (percentage < 100) return { status: "adequate", percentage };
  if (percentage <= 100) return { status: "optimal", percentage };
  return { status: "excess", percentage };
}

/**
 * Get micronutrient recommendations based on goal
 */
export function getMicronutrientRecommendations(
  goal: FitnessGoal,
  gender: Gender
): Record<string, string> {
  const recommendations: Record<string, Record<string, string>> = {
    iron: {
      male: "Ensure 8mg daily for muscle oxygen transport and energy production",
      female: "Ensure 18mg daily (or 8mg post-50) for hemoglobin synthesis",
    },
    calcium: {
      male: "Aim for 1000-1200mg for bone strength and muscle contraction",
      female: "Aim for 1000-1200mg (increase to 1200mg post-50) for bone health",
    },
    magnesium: {
      male: "Target 400-420mg for muscle recovery and protein synthesis",
      female: "Target 310-320mg for muscular function and energy metabolism",
    },
    zinc: {
      male: "Get 11mg daily for testosterone production and immune function",
      female: "Get 8mg daily for immune response and protein synthesis",
    },
    vitaminD: {
      male: "Supplement 600-1000 IU for bone health and testosterone support",
      female: "Supplement 600-1000 IU for calcium absorption and immunity",
    },
    b12: {
      male: "Ensure 2.4mcg daily for energy metabolism and muscle function",
      female: "Ensure 2.4mcg daily for red blood cell formation and nerve function",
    },
  };

  const result: Record<string, string> = {};
  for (const [key, values] of Object.entries(recommendations)) {
    result[key] = values[gender];
  }
  return result;
}
