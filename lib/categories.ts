export const CATEGORIES = [
  { slug: "lawn-care",    label: "Lawn Care",    description: "Mowing, watering, fertilizing and seasonal lawn maintenance tips." },
  { slug: "landscaping",  label: "Landscaping",  description: "Design ideas, hardscaping, and transforming your outdoor space." },
  { slug: "pest-control", label: "Pest Control", description: "Identify and eliminate lawn pests, weeds, and diseases." },
  { slug: "tree-care",    label: "Tree Care",    description: "Pruning, planting, and caring for trees and shrubs." },
  { slug: "gardening",    label: "Gardening",    description: "Vegetable gardens, flower beds, and companion planting guides." },
  { slug: "home-garden",  label: "Home & Garden",description: "Outdoor living, garden tools, and home improvement tips." },
  { slug: "grass-types",  label: "Grass Types",  description: "Identify, select, and maintain the best grass varieties for your climate." },
] as const;

export type CategorySlug = typeof CATEGORIES[number]["slug"];
