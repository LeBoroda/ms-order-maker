export default function AboutPage() {
  return (
    <section className="page about-page">
      <header>
        <h2>About MS Order Maker</h2>
      </header>

      <div className="card">
        <p>
          This UI is a lightweight companion for the MoySklad platform. It lets
          managers check stock, build draft orders and email them to sales in a
          couple of clicks.
        </p>
        <ul className="about-list">
          <li>Reads available stock through MoySklad API.</li>
          <li>Provides a clean order builder with automatic totals.</li>
          <li>Keeps a local history to re-use popular orders.</li>
          <li>Plays nicely on desktop and tablet layouts.</li>
        </ul>
        <p>
          You can plug this UI into your existing infrastructure by wiring API
          calls inside <code>services/moyskladClient.ts</code> and connecting
          the order submission to your mail transport.
        </p>
      </div>
    </section>
  );
}
