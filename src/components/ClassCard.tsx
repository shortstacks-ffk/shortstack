'use client'

import { Card } from "@/src/components/ui/card"

export const ClassCard = ({ classItem }) => {
  return (
    <Card className="w-[250px] h-[250px] rounded-xl flex flex-col justify-center items-center">
      <div className="text-4xl mb-4">{classItem.emoji}</div>
      <h3 className="text-xl font-semibold">{classItem.name}</h3>
      <p className="text-muted-foreground">{classItem.code}</p>
    </Card>
  )
}