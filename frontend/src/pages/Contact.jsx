const PHONE = import.meta.env.VITE_STORE_PHONE || '+91 98765 43210';
const ADDRESS = import.meta.env.VITE_STORE_ADDRESS || '123, Main Street, Your City - 600001';
const MAP_EMBED = import.meta.env.VITE_GOOGLE_MAP_EMBED || '';

const hours = [
  { day: 'Monday – Saturday', time: '10:00 AM – 8:00 PM' },
  { day: 'Sunday', time: '11:00 AM – 6:00 PM' },
];

export default function Contact() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="font-display text-3xl font-bold text-rose-800 text-center mb-8">
        Contact & Visit Store
      </h1>

      <div className="grid md:grid-cols-2 gap-8 mb-10">
        <div className="space-y-6">
          <div>
            <h2 className="font-semibold text-gray-800 mb-2">Address</h2>
            <p className="text-gray-600">{ADDRESS}</p>
          </div>
          <div>
            <h2 className="font-semibold text-gray-800 mb-2">Phone</h2>
            <a href={`tel:${PHONE.replace(/\s/g, '')}`} className="text-rose-600 hover:underline">
              {PHONE}
            </a>
          </div>
          <div>
            <h2 className="font-semibold text-gray-800 mb-2">Opening Hours</h2>
            <ul className="text-gray-600 space-y-1">
              {hours.map((h) => (
                <li key={h.day}>
                  <span className="font-medium">{h.day}:</span> {h.time}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden bg-cream-200 min-h-[250px]">
          {MAP_EMBED ? (
            <iframe
              src={MAP_EMBED}
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: '250px' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Store location"
            />
          ) : (
            <div className="w-full h-full min-h-[250px] flex items-center justify-center text-gray-500">
              Add VITE_GOOGLE_MAP_EMBED in .env for map
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
