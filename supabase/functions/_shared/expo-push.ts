// Envoi de notifications push via le service Expo Push API.
// https://docs.expo.dev/push-notifications/sending-notifications/

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendExpoPushNotifications(
  messages: ExpoPushMessage[],
): Promise<void> {
  if (messages.length === 0) return;

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(messages),
  });

  if (!res.ok) {
    console.error("expo push send failed", res.status, await res.text());
  }
}
