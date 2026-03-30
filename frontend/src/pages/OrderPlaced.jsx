import { Link, useParams } from 'react-router-dom';

function StepCircle({ kind, label }) {
  const common =
    'h-12 w-12 rounded-full flex items-center justify-center border text-lg font-semibold';
  if (kind === 'done') {
    return (
      <div className={`${common} bg-green-50 border-green-200 text-green-600`}>
        ✓
      </div>
    );
  }
  if (kind === 'pending') {
    return (
      <div className={`${common} bg-white border-rose-200 text-rose-500`}>
        {label}
      </div>
    );
  }
  return <div className={`${common} bg-white border-rose-200 text-rose-500`} />;
}

export default function OrderPlaced() {
  const { orderId } = useParams();
  const decodedOrderId = orderId ? String(orderId) : '';

  // This page is shown immediately after placing order, so default to "Placed".
  const activeIndex = 0;
  const steps = [
    { key: 'received', label: '✓', text: 'Order received' },
    { key: 'confirmed', label: '✅', text: 'Confirmed' },
    { key: 'packed', label: '📦', text: 'Packed' },
    { key: 'shipped', label: '🚚', text: 'Shipped' },
  ];

  return (
    <div className="max-w-md mx-auto px-4 py-10 md:py-14">
      <div className="bg-white rounded-3xl border border-rose-100 shadow-sm p-8 md:p-10 text-center">
        <div className="flex justify-center mb-5">
          <div className="h-16 w-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
            <span className="text-3xl text-green-600 font-semibold">✓</span>
          </div>
        </div>

        <div className="text-rose-800 font-display font-bold text-2xl md:text-3xl leading-tight mb-2">
          Order Placed!
        </div>
        <div className="text-xs md:text-sm text-gray-500 mb-6">
          Thank you for shopping with
          <br />
          <span className="text-rose-700 font-medium">New Balaji Bangles &amp; Fancy</span>
        </div>

        <div className="inline-flex items-center bg-rose-50 border border-rose-100 rounded-2xl px-5 py-2 mb-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 mr-2">Order ID:</span>
          <span className="font-mono font-semibold text-rose-800">{decodedOrderId}</span>
        </div>

        {/* Stepper */}
        <div className="mt-2">
          <div className="flex items-start justify-between gap-2 mb-3">
            {steps.map((s, idx) => {
              const done = idx <= activeIndex;
              const circleKind = done ? 'done' : 'pending';
              return (
                <div key={s.key} className="flex-1">
                  <div className="flex justify-center">
                    <StepCircle kind={circleKind} label={s.label} />
                  </div>
                  <div className="mt-2 text-[11px] font-semibold text-rose-800">{s.text}</div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            {steps.map((_, idx) => {
              if (idx === steps.length - 1) return null;
              const done = idx < activeIndex;
              return (
                <div
                  // line segments between circles
                  key={`line-${idx}`}
                  className={`flex-1 h-[2px] rounded-full ${done ? 'bg-green-500' : 'bg-rose-200'}`}
                />
              );
            })}
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <Link
            to={`/track?order=${encodeURIComponent(decodedOrderId)}`}
            className="block w-full bg-rose-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-rose-600 transition"
          >
            TRACK MY ORDER
          </Link>
          <Link
            to="/shop"
            className="block w-full bg-white border border-rose-200 text-rose-700 px-8 py-3 rounded-xl font-semibold hover:bg-rose-50 transition"
          >
            CONTINUE SHOPPING
          </Link>
        </div>
      </div>
    </div>
  );
}

