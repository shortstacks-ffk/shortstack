export const getRandomColorClass = (seed: string) => {
  const colors = [
    'bg-red-100',
    'bg-blue-100',
    'bg-green-100',
    'bg-yellow-100',
    'bg-purple-100',
    'bg-pink-100',
    'bg-orange-100',
    'bg-teal-100'
  ];
  
  // Add console.log to debug
  // console.log('Seed:', seed);
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const selectedColor = colors[hash % colors.length];
  // console.log('Selected color:', selectedColor);
  
  return selectedColor;
}