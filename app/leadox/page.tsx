"use client";

import { useEffect, useRef, useState } from "react";

const CHAT_MESSAGES = [
  { from: "customer", text: "היי, אפשר הצעת מחיר לאירוע?" },
  { from: "ai", text: "בטח 🙂 לכמה אנשים ומתי האירוע?" },
  { from: "customer", text: "בערך 40 איש ביום חמישי" },
  { from: "ai", text: "מעולה. בניתי לך ליד, הצעת כיוון, וגם סימנתי תאריך ביומן." },
  { from: "customer", text: "תיצור לי תמונה לסטורי בבקשה" },
  { from: "ai", text: "בשמחה! יצרתי לך עיצוב לסטורי על בסיס האירוע של יום חמישי 🎨 שלחתי אליך — מוכן לשיתוף מיידי." },
];

function WhatsAppChat() {
  const [visibleCount, setVisibleCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visibleCount >= CHAT_MESSAGES.length) return;
    const delay = visibleCount === 0 ? 600 : 1200;
    const timer = setTimeout(() => setVisibleCount((n) => n + 1), delay);
    return () => clearTimeout(timer);
  }, [visibleCount]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleCount]);

  return (
    <div className="flex flex-col h-full gap-2 p-3 overflow-y-auto">
      {CHAT_MESSAGES.slice(0, visibleCount).map((msg, i) => (
        <div
          key={i}
          className={`flex ${msg.from === "customer" ? "justify-end" : "justify-start"} animate-fade-in`}
        >
          <div
            className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${
              msg.from === "customer"
                ? "bg-[#dcf8c6] text-gray-800 rounded-br-sm"
                : "bg-white text-gray-800 rounded-bl-sm"
            }`}
          >
            {msg.text}
            {msg.from === "ai" && (
              <div className="text-[10px] text-[#25d366] font-bold mt-1">AI</div>
            )}
          </div>
        </div>
      ))}
      {visibleCount < CHAT_MESSAGES.length && (
        <div className="flex justify-start">
          <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-2 shadow-sm">
            <span className="flex gap-1 items-center h-4">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
            </span>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

function StatCard({ label, value, change }: { label: string; value: string; change: string }) {
  return (
    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-lg font-black text-gray-900">{value}</div>
      <div className="text-xs font-bold text-emerald-600">{change}</div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="text-3xl mb-3">{icon}</div>
      <div className="font-bold text-gray-900 mb-1">{title}</div>
      <div className="text-sm text-gray-500 leading-relaxed">{desc}</div>
    </div>
  );
}

function PricingCard({
  name,
  price,
  items,
  highlighted,
}: {
  name: string;
  price: string;
  items: string[];
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-6 border flex flex-col gap-4 relative ${
        highlighted
          ? "bg-[#25d366] text-white border-[#25d366] shadow-xl scale-105"
          : "bg-white text-gray-900 border-gray-200 shadow-sm"
      }`}
    >
      {highlighted && (
        <div className="absolute -top-3 right-1/2 translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-black px-3 py-1 rounded-full whitespace-nowrap">
          הכי מומלץ
        </div>
      )}
      <div>
        <div className={`text-lg font-black ${highlighted ? "text-white" : "text-gray-900"}`}>{name}</div>
        <div className={`text-3xl font-black mt-1 ${highlighted ? "text-white" : "text-[#25d366]"}`}>{price}</div>
        <div className={`text-xs mt-0.5 ${highlighted ? "text-green-100" : "text-gray-400"}`}>הקמה חד פעמית</div>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((item, i) => (
          <li key={i} className={`text-sm flex items-start gap-2 ${highlighted ? "text-white" : "text-gray-700"}`}>
            <span className={highlighted ? "text-white" : "text-[#25d366]"}>✔</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function LeadoxPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#f0fdf4] font-[Assistant,Heebo,sans-serif]">
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-[#25d366]">LEAD</span>
            <span className="text-2xl font-black text-gray-900">OX</span>
          </div>
          <div className="flex gap-2">
            <a
              href="https://wa.me/972500000000"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25d366] text-white text-sm font-bold px-4 py-2 rounded-full hover:bg-[#1fba58] transition-colors"
            >
              דברו איתנו
            </a>
            <a
              href="https://wa.me/972500000000"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-[#25d366] text-[#25d366] text-sm font-bold px-4 py-2 rounded-full hover:bg-green-50 transition-colors"
            >
              קבע ייעוץ
            </a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-5xl mx-auto px-4 pt-14 pb-10">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="flex flex-col gap-5">
            <div className="inline-flex items-center gap-2 bg-[#25d366]/10 text-[#1aab52] text-sm font-bold px-4 py-2 rounded-full w-fit">
              <span>⚡</span>
              AI שמחבר וואטסאפ, לידים, יומן ודשבורד
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 leading-tight">
              AI שמכניס לעסק שלך יותר לקוחות — אוטומטית.
            </h1>
            <p className="text-gray-600 leading-relaxed">
              מערכת חכמה לעסקים שמקבלים פניות מאינסטגרם ווואטסאפ: עונה ללקוחות, סוגרת לידים, שומרת הכל בדשבורד,
              כותבת ביומן ומציעה לך מה לפרסם כדי למכור יותר.
            </p>
            <div className="flex gap-3 flex-wrap">
              <a
                href="https://wa.me/972500000000"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#25d366] text-white font-bold px-6 py-3 rounded-full hover:bg-[#1fba58] transition-colors shadow-lg shadow-green-200"
              >
                אני רוצה דמו
              </a>
              <a
                href="https://wa.me/972500000000"
                target="_blank"
                rel="noopener noreferrer"
                className="border-2 border-[#25d366] text-[#25d366] font-bold px-6 py-3 rounded-full hover:bg-green-50 transition-colors"
              >
                שלח הודעה בוואטסאפ
              </a>
            </div>
          </div>

          {/* PHONE MOCKUP */}
          <div className="flex flex-col items-center gap-4">
            {/* Dashboard preview */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-full max-w-sm">
              <div className="text-xs text-gray-400 font-bold mb-3">Dashboard · היום</div>
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="לידים" value="128" change="+18%" />
                <StatCard label="הזמנות" value="32" change="+12%" />
                <StatCard label="אירועים" value="18" change="+24%" />
                <StatCard label="הכנסות" value="₪24.6K" change="+36%" />
              </div>
            </div>

            {/* WhatsApp Chat */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-full max-w-sm">
              <div className="bg-[#075e54] text-white px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#25d366] flex items-center justify-center text-lg">🍽️</div>
                <div>
                  <div className="font-bold text-sm">טעם הבית קייטרינג</div>
                  <div className="text-xs text-green-300">מחובר</div>
                </div>
                <div className="mr-auto text-gray-300 text-lg">⋮</div>
              </div>
              <div
                className="h-72 overflow-y-auto"
                style={{
                  background: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3C/svg%3E\") #e5ddd5",
                }}
              >
                <WhatsAppChat />
              </div>
              <div className="bg-[#f0f0f0] px-3 py-2 text-[10px] text-center text-gray-400 font-semibold tracking-wide">
                POWERED BY LEADOX AI
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BUILT ON REAL NEED */}
      <div className="max-w-5xl mx-auto px-4 pb-8">
        <p className="text-center text-gray-500 text-sm">
          נבנה על צורך אמיתי של עסק פעיל — לא עוד &quot;בוט&quot;, אלא מערכת שמביאה סדר ומכירות.
        </p>
      </div>

      {/* FEATURES */}
      <section className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-black text-gray-900 text-center mb-2">כל מה שהעסק שלך צריך — במקום אחד</h2>
          <p className="text-center text-gray-500 text-sm mb-10">
            במקום לפספס הודעות, לרדוף אחרי לקוחות ולנחש מה לפרסם — המערכת עובדת בשבילך.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard
              icon="💬"
              title="AI בוואטסאפ"
              desc="עונה ללקוחות, שואל שאלות נכונות, מסנן לידים ומעביר אותך לסגירה בזמן הנכון."
            />
            <FeatureCard
              icon="📊"
              title="דשבורד לידים"
              desc="כל הפניות, ההזמנות, הסטטוסים והלקוחות במקום אחד ברור ונוח."
            />
            <FeatureCard
              icon="📅"
              title="חיבור ליומן"
              desc="אירועים, תזכורות ופגישות נכנסים אוטומטית ליומן שלך כדי שלא תפספס כלום."
            />
            <FeatureCard
              icon="📱"
              title="אנליסט אינסטגרם"
              desc="בודק מה עובד, איזה תוכן מושך לקוחות ומה כדאי לפרסם בפוסט או בריל הבא."
            />
            <FeatureCard
              icon="🧠"
              title="ייעוץ הזמנות חכם"
              desc="עוזר ללקוח להבין כמה להזמין, מה מתאים לאירוע ואיך להגיע להצעה נכונה."
            />
            <FeatureCard
              icon="🚀"
              title="יותר סגירות"
              desc="פחות בלאגן, פחות זמן בטלפון, יותר מעקב, יותר סדר — ויותר לקוחות שסוגרים."
            />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-16 max-w-5xl mx-auto px-4">
        <h2 className="text-2xl font-black text-gray-900 text-center mb-2">איך זה עובד?</h2>
        <p className="text-center text-gray-500 text-sm mb-10">
          תהליך פשוט שמתחיל מהודעת לקוח ונגמר בליד מסודר שמוכן לסגירה.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {[
            { n: "1", title: "לקוח פונה", sub: "וואטסאפ / אינסטגרם" },
            { n: "2", title: "AI עונה", sub: "שואל ומכוון" },
            { n: "3", title: "נפתח ליד", sub: "כל הפרטים נשמרים" },
            { n: "4", title: "נכנס ליומן", sub: "אירוע/פגישה/תזכורת" },
            { n: "5", title: "אתה סוגר", sub: "עם סדר וביטחון" },
          ].map((step) => (
            <div key={step.n} className="flex flex-col items-center gap-1 w-28 text-center">
              <div className="w-10 h-10 rounded-full bg-[#25d366] text-white font-black text-lg flex items-center justify-center shadow-lg shadow-green-200">
                {step.n}
              </div>
              <div className="font-bold text-gray-900 text-sm">{step.title}</div>
              <div className="text-xs text-gray-500">{step.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* BEFORE / AFTER */}
      <section className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-black text-gray-900 text-center mb-10">לפני ואחרי SmartBusiness AI</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
              <div className="font-black text-red-600 text-lg mb-4">לפני ❌</div>
              <ul className="flex flex-col gap-3">
                {[
                  "הודעות מפוזרות בוואטסאפ",
                  "לקוחות נשכחים בלי מעקב",
                  "אין סדר בהזמנות",
                  "לא יודעים איזה תוכן מביא לקוחות",
                  "יותר מדי זמן על שאלות חוזרות",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-red-700">
                    <span className="text-red-400 font-bold">✖</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
              <div className="font-black text-[#1aab52] text-lg mb-4">אחרי ✅</div>
              <ul className="flex flex-col gap-3">
                {[
                  "כל ליד נכנס לדשבורד",
                  "AI עונה ומסנן אוטומטית",
                  "אירועים נכנסים ליומן",
                  "המלצות תוכן לאינסטגרם",
                  "יותר סגירות ופחות כאב ראש",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-green-700">
                    <span className="text-[#25d366] font-bold">✔</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-16 max-w-5xl mx-auto px-4">
        <h2 className="text-2xl font-black text-gray-900 text-center mb-2">חבילות לדוגמה</h2>
        <p className="text-center text-gray-500 text-sm mb-12">
          אפשר להתחיל קטן ולהגדיל לפי הצורך של העסק.
        </p>
        <div className="grid sm:grid-cols-3 gap-6 items-center">
          <PricingCard
            name="Starter"
            price="₪1,490"
            items={["דף נחיתה בסיסי", "טופס ליד חכם", "כפתור וואטסאפ", "דשבורד בסיסי"]}
          />
          <PricingCard
            name="Business AI"
            price="₪3,900"
            highlighted
            items={[
              "AI בוואטסאפ",
              "דשבורד לידים",
              "חיבור ליומן",
              "ייעוץ הזמנות חכם",
              "תסריטי מכירה",
            ]}
          />
          <PricingCard
            name="Premium"
            price="₪6,900+"
            items={[
              "הכל בחבילת Business",
              "אנליסט מטא/אינסטגרם",
              "אוטומציות מתקדמות",
              "דוחות שבועיים",
              "ליווי והטמעה",
            ]}
          />
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-[#075e54] py-16 text-center px-4">
        <h2 className="text-2xl font-black text-white mb-3">רוצה לקחת את העסק שלך לשלב הבא?</h2>
        <p className="text-green-200 mb-8">שלח הודעה ונבדוק יחד איזה מערכת AI הכי מתאימה לעסק שלך.</p>
        <div className="flex gap-4 justify-center flex-wrap">
          <a
            href="https://wa.me/972500000000"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#25d366] text-white font-bold px-8 py-3 rounded-full hover:bg-[#1fba58] transition-colors shadow-lg"
          >
            קבע שיחת ייעוץ חינם
          </a>
          <a
            href="https://wa.me/972500000000"
            target="_blank"
            rel="noopener noreferrer"
            className="border-2 border-[#25d366] text-[#25d366] font-bold px-8 py-3 rounded-full hover:bg-[#25d366] hover:text-white transition-colors"
          >
            דברו איתנו בוואטסאפ
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#064a41] text-green-300 text-center text-xs py-5 px-4">
        LEADOX © 2026 · AI שעובד בשבילך, 24/7
      </footer>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </main>
  );
}
