export const promotionCode = "ЛАСТОЧКА10";
export const pickupPoints = [
  {
    id: "kalinina",
    name: "Ласточка Джами",
    address: "Нальчик, ул. Калинина, 76",
  },
];
export function availableSlots(mode: string, now = new Date()) {
  // One shop timezone; dates and labels must not depend on a customer's device.
  const shopDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return Array.from({ length: 3 }, (_, index) => {
    const date = new Date(`${shopDate}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index + 1);
    const iso = date.toISOString().slice(0, 10);
    return ["10:00–12:00", "12:00–14:00", "16:00–18:00"].map((label) => ({
      id: `${mode}|${iso}|${label}`,
      date: date.toLocaleDateString("ru-RU", {
        timeZone: "Europe/Moscow",
        day: "numeric",
        month: "long",
      }),
      label,
    }));
  }).flat();
}
