// Utility function to estimate reading time in minutes based on words count
export function readingTime(html: string) {
   const textOnly = html.replace(/<[^>]+>/g, '')
   const wordCount = textOnly.split(/\s+/).length
   const readingTimeMinutes = (wordCount / 200 + 1).toFixed()
   return `${readingTimeMinutes} min read`
}
