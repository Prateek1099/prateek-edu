interface PremiumViewerProps {
  children: React.ReactNode;
}

/**
 * Compatibility wrapper retained while Vexa is free for all students.
 * Payment and entitlement infrastructure remains in place for a future launch.
 */
export function PremiumViewer({ children }: PremiumViewerProps) {
  return <>{children}</>;
}
