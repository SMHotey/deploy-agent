import React from 'react';
import { cn } from '@/lib/utils';

// A simple wrapper that ensures horizontal scrolling on narrow viewports.
// Usage: wrap a <table> with <ResponsiveTable><thead>...</thead><tbody>...</tbody></table></ResponsiveTable>
export function ResponsiveTable({ children, className }: { children: React.ReactNode; className?: string; }) {
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="min-w-full">{children}</table>
    </div>
  );
}

export default ResponsiveTable;
