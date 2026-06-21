// Visa Doo - connection settings for the database & login
window.VISADOO_CONFIG = {
  SUPABASE_URL: "https://rfueqawvadcvhpmleeoi.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_LyaaSuHTI2x6rCc_HmD-iA_bR9gLx7i",
  WHATSAPP: "919895226697",          // digits only, used for wa.me link
  PHONE_DISPLAY: "+91 98952 26697",
  PHONE_TEL: "+919895226697",
  EMAIL: "hello@visadoo.com",
  VISAS: [
    {
      id: "30-day Single Entry",
      name: "30-Day Tourist Visa",
      sub: "Single Entry",
      price: 350,
      days: 30,
      popular: true,
      blurb: "Perfect for a short holiday or a quick visit to the UAE."
    },
    {
      id: "60-day Single Entry",
      name: "60-Day Tourist Visa",
      sub: "Single Entry",
      price: 799,
      days: 60,
      popular: false,
      blurb: "More time to explore, visit family, or handle business."
    }
  ],
  STAGES: [
    "Submitted",
    "Documents Verified",
    "Under Review",
    "Payment Confirmed",
    "Approved",
    "Visa Issued"
  ]
};
