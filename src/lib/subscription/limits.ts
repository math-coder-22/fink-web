export const FREE_PLAN_LIMITS = {
  budgetCategories: 10,
  incomeCategories: 1,
  savingGoals: 2,
} as const

export function upgradeMessage(feature: string) {
  return `${feature} sudah mencapai batas paket Free. Upgrade ke Premium untuk fitur unlimited.`
}
