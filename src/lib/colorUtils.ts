export const getRandomColorClass = (seed: string) => {
    const colors = [
      'bg-red-100', 'bg-blue-100', 'bg-green-100',
      'bg-yellow-100', 'bg-purple-100', 'bg-pink-100'
    ]
    const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }