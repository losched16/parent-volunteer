// lib/email/index.ts

const WEBHOOK_URLS = {
  welcome: "https://services.leadconnectorhq.com/hooks/sgdhr60vufwWbqZodBIt/webhook-trigger/189e59ef-fe17-4111-88c8-22df00fbb84e",
  signup_confirmation: "https://services.leadconnectorhq.com/hooks/sgdhr60vufwWbqZodBIt/webhook-trigger/8c9962a4-dd72-4a4b-be6e-54e8939dda65",
  event_reminder: "https://services.leadconnectorhq.com/hooks/sgdhr60vufwWbqZodBIt/webhook-trigger/1092851e-f94b-4d72-a044-8811c5556547",
  thank_you: "https://services.leadconnectorhq.com/hooks/sgdhr60vufwWbqZodBIt/webhook-trigger/b4a9eba2-5762-4abd-9f0d-ab11907b71d4",
  cancellation: "https://services.leadconnectorhq.com/hooks/sgdhr60vufwWbqZodBIt/webhook-trigger/e2c5cf62-4ba3-4962-8ce6-5386d594f1eb",
  milestone: "https://services.leadconnectorhq.com/hooks/sgdhr60vufwWbqZodBIt/webhook-trigger/2e87857f-9190-4337-9095-9155fe47ee2a",
  broadcast: "https://services.leadconnectorhq.com/hooks/sgdhr60vufwWbqZodBIt/webhook-trigger/f630d8b1-49bc-4e3c-b897-37ae08e38240",
};

const PORTAL_URL = process.env.APP_URL || "https://volunteers.salemmontessori.org";

async function triggerWebhook(url: string, data: any): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, portal_url: PORTAL_URL }),
    });
    console.log(`Webhook triggered: ${data.type} → ${response.status}`);
    return response.ok;
  } catch (error) {
    console.error(`Webhook failed: ${data.type}`, error);
    return false;
  }
}

export async function sendWelcomeEmail(parent: {
  email: string;
  first_name: string;
}, requiredHours: number): Promise<boolean> {
  return triggerWebhook(WEBHOOK_URLS.welcome, {
    type: "welcome",
    email: parent.email,
    first_name: parent.first_name,
    required_hours: requiredHours,
    hours_completed: 0,
    hours_remaining: requiredHours,
  });
}

export async function sendSignupConfirmation(parent: {
  email: string;
  first_name: string;
}, event: {
  title: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string;
  hours_credit: number;
}): Promise<boolean> {
  const date = new Date(event.event_date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formatTime = (t: string) => {
    if (!t) return "";
    const [h, m] = t.split(":");
    const hr = parseInt(h);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
  };

  return triggerWebhook(WEBHOOK_URLS.signup_confirmation, {
    type: "signup_confirmation",
    email: parent.email,
    first_name: parent.first_name,
    event_title: event.title,
    event_date: date,
    start_time: formatTime(event.start_time),
    end_time: formatTime(event.end_time),
    location: event.location,
    hours_credit: event.hours_credit,
  });
}

export async function sendEventReminder(parent: {
  email: string;
  first_name: string;
}, event: {
  title: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string;
}): Promise<boolean> {
  const date = new Date(event.event_date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formatTime = (t: string) => {
    if (!t) return "";
    const [h, m] = t.split(":");
    const hr = parseInt(h);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
  };

  return triggerWebhook(WEBHOOK_URLS.event_reminder, {
    type: "event_reminder",
    email: parent.email,
    first_name: parent.first_name,
    event_title: event.title,
    event_date: date,
    start_time: formatTime(event.start_time),
    end_time: formatTime(event.end_time),
    location: event.location,
  });
}

export async function sendThankYouEmail(parent: {
  email: string;
  first_name: string;
}, event: {
  title: string;
  hours_credit: number;
}, totalHours: number, requiredHours: number): Promise<boolean> {
  return triggerWebhook(WEBHOOK_URLS.thank_you, {
    type: "thank_you",
    email: parent.email,
    first_name: parent.first_name,
    event_title: event.title,
    hours_credit: event.hours_credit,
    total_hours: totalHours,
    required_hours: requiredHours,
    hours_remaining: Math.max(0, requiredHours - totalHours),
    progress_percentage: Math.min(100, Math.round((totalHours / requiredHours) * 100)),
  });
}

export async function sendCancellationConfirmation(parent: {
  email: string;
  first_name: string;
}, event: {
  title: string;
  event_date: string;
}): Promise<boolean> {
  const date = new Date(event.event_date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return triggerWebhook(WEBHOOK_URLS.cancellation, {
    type: "cancellation",
    email: parent.email,
    first_name: parent.first_name,
    event_title: event.title,
    event_date: date,
  });
}

export async function sendMilestoneEmail(parent: {
  email: string;
  first_name: string;
}, milestone: number, totalHours: number, requiredHours: number): Promise<boolean> {
  return triggerWebhook(WEBHOOK_URLS.milestone, {
    type: "milestone",
    email: parent.email,
    first_name: parent.first_name,
    milestone,
    total_hours: totalHours,
    required_hours: requiredHours,
    hours_remaining: Math.max(0, requiredHours - totalHours),
  });
}

export async function sendBroadcastEmail(
  to: string,
  subject: string,
  body: string,
  parentName: string,
  hoursRemaining: number
): Promise<boolean> {
  return triggerWebhook(WEBHOOK_URLS.broadcast, {
    type: "broadcast",
    email: to,
    first_name: parentName,
    subject,
    body,
    hours_remaining: hoursRemaining,
  });
}

export default triggerWebhook;
