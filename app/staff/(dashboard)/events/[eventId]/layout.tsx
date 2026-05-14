import type { ReactNode } from "react";

type Props = { children: ReactNode; params: Promise<{ eventId: string }> };

export default async function StaffEventSegmentLayout({ children, params }: Props) {
  await params;
  return children;
}

