import type { Dataset } from './types'

export function getChatSuggestions(dataset: Dataset | null): string[] {
  if (!dataset) return []
  const columns = dataset.metadata.columns || []
  const numeric = columns.filter(column =>
    ['int', 'float', 'number'].some(type => column.type.toLowerCase().includes(type))
  )
  const categories = columns.filter(
    column =>
      !numeric.includes(column) &&
      column.type.toLowerCase() !== 'datetime' &&
      column.unique > 1 &&
      column.unique <= 40
  )
  const suggestions = ['Summarize this dataset', 'Which columns have missing values?']
  const metric =
    numeric.find(column => /revenue|sales|profit|balance|amount|total/i.test(column.name)) || numeric[0]
  if (metric) {
    suggestions.push(`What is the average ${metric.name}?`)
    suggestions.push(`${metric.name} ka average kya hai?`)
  }
  if (categories.length && metric) {
    const category =
      categories.find(column => /category|region|segment|product|group|job/i.test(column.name)) ||
      categories[0]
    suggestions.push(`Which ${category.name} has the highest total ${metric.name}?`)
  } else if (numeric.length > 1) {
    suggestions.push('Find correlations between numeric columns')
  }
  return suggestions
}
