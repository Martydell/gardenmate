import type { ReactNode } from 'react';

function PageHeaderBand({ children }: { children: ReactNode }) {
  return (
    <div className="bg-gradient-to-b from-brand-100 via-brand-50/70 to-transparent px-4 pb-5 pt-6 dark:from-brand-950/50 dark:via-neutral-950/30 dark:to-transparent">
      {children}
    </div>
  );
}

export default PageHeaderBand;
