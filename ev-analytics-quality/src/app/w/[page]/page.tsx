'use client';
import { useApp } from '@/components/AppContext';
import { SUITES } from '@/suites';

export default function Page({ params }: { params: { page: string } }) {
  const { me } = useApp();
  const Suite = SUITES[params.page];
  // A screen is shown only to profiles that have it in their navigation. The server refuses the queries as well.
  if (!Suite || (me && !me.nav.some((g: any) => g.pages.some((p: any) => p.id === params.page)))) return <div className="note">This page is not part of your profile. Use the navigation on the left to see what you can open.</div>;
  return <Suite page={params.page} />;
}
