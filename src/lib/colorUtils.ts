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
  
  // Use the class code, get the ASCII value of each character and sum them up
  // Then use the modulo operator to get the index of the color
  // Then return the color
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const selectedColor = colors[hash % colors.length];

  return selectedColor;
}