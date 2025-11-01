'use client';

import { useParams } from 'next/navigation';
import GenericDetailView from './GenericDetailView';

export default function GenericTemplatePage() {
  const params = useParams();
  const templateId = params.templateId as string;

  return <GenericDetailView templateId={templateId} />;
}