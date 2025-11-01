import React, { useState, useEffect } from "react";
import { getStoreItem } from "@/src/app/actions/storeFrontActions";
import { notFound } from "next/navigation";
import { StoreItemDetailClient } from "./StoreItemDetailClient";

type PageProps = {
  params: Promise<{ storeItemId: string }>;
};

export default async function StoreItemDetailPage({ params }: PageProps) {
  const { storeItemId } = await params;
  
  const response = await getStoreItem(storeItemId);

  if (!response.success || !response.data) {
    return notFound();
  }

  return <StoreItemDetailClient storeItem={response.data} />;
}
