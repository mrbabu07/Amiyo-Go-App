export const notificationMatrix = {
  "question.answered": ["IN_APP", "PUSH"],
  "chat.message.created": ["IN_APP", "PUSH"],
  "stock.available": ["IN_APP", "PUSH"],
  "price.target.reached": ["IN_APP", "PUSH"],
  "campaign.started": ["IN_APP"]
} as const;

export function notificationChannels(eventType: keyof typeof notificationMatrix) { return notificationMatrix[eventType]; }
