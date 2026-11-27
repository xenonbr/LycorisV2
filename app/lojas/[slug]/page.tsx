"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import PartnerStoreCatalogView from '@/components/PartnerStoreCatalogView';

export default function StoreSlugPage() {
  const params = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : 'sawvr';
  return <PartnerStoreCatalogView slug={slug} />;
}
