'use client'

import { Card } from "@/src/components/ui/card"

interface ClassCardProps {
  emoji: string;
  name: string;
  code: number;
  colorClass: string;
}

const colors = [
  'bg-red-100', 'bg-blue-100', 'bg-green-100', 
  'bg-yellow-100', 'bg-purple-100', 'bg-pink-100'
];

export const ClassCard = ({ emoji, name, code, colorClass }: ClassCardProps) => {
  return (
    <Card className={`w-[250px] h-[250px] rounded-xl flex flex-col justify-center items-center ${colorClass}`}>
      <div className="text-4xl mb-4">{emoji}</div>
      <h3 className="text-xl font-semibold">{name}</h3>
      <p className="text-muted-foreground">#{code.toString().padStart(4, '0')}</p>
    </Card>
  )
}

// 'use client'

// import { Card } from "@/src/components/ui/card"

// export const ClassCard = () => {
//   return (
//     <Card className="w-[250px] h-[250px] rounded-xl flex flex-col justify-center items-center">
//       <div className="text-4xl mb-4"> Emoji</div>
//       <h3 className="text-xl font-semibold"> Class name</h3>
//       <p className="text-muted-foreground"> Class Code</p>
//     </Card>
//   )
// }