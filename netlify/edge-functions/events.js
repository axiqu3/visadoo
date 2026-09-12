// Visa Doo — Travel Triggers Edge Function (/events and /events.html)
// Rewrites seamlessly to /events/events.html so the client receives the modern, responsive Travel Triggers page.

export default async (request, context) => {
  try {
    if (context && typeof context.rewrite === "function") {
      return context.rewrite("/events/events.html");
    }
  } catch (e) {
    console.warn("Context rewrite fallback:", e);
  }
  return fetch(new URL("/events/events.html", request.url));
};

export const config = { path: ["/events", "/events.html"] };
