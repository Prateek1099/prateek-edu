export type NotificationType =
  | "PLAN_INCOMPLETE"
  | "TOPIC_STALE"
  | "EXAM_APPROACHING"
  | "PLAN_MILESTONE";

export interface NotificationPayload {
  type: NotificationType;
  userId: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

/**
 * Queues a notification for delivery.
 * TODO: Integrate with email (nodemailer) or push notifications.
 */
export async function queueNotification(payload: NotificationPayload): Promise<void> {
  // TODO: Integrate with email (nodemailer) or push notifications
  console.log("[Notification Architecture] Would send:", payload.type, "to", payload.userId);
}
