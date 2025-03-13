import type { Links } from "@/types"

// Helper function to determine if a nav item has children
export const menuItemhasChildren = (item: Links) => item.CHILDREN && item.CHILDREN.length > 0
