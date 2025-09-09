export default function TabPanels() {
  return (
    <>
      <div id="content-tab-list" role="tablist" className="TabList">
        <button
          id="content-tab-0"
          type="button"
          role="tab"
          aria-controls="content-tab-panel-0"
          aria-selected="true"
          tabIndex={0}
          className="Tab"
        >
          Editor&apos;s advice
        </button>
        <button
          id="content-tab-1"
          type="button"
          role="tab"
          aria-controls="content-tab-panel-1"
          aria-selected="false"
          tabIndex={-1}
          className="Tab"
        >
          Key Details
        </button>
        <button
          id="content-tab-2"
          type="button"
          role="tab"
          aria-controls="content-tab-panel-2"
          aria-selected="false"
          tabIndex={-1}
          className="Tab"
        >
          Ingredients
        </button>
        <button
          id="content-tab-3"
          type="button"
          role="tab"
          aria-controls="content-tab-panel-3"
          aria-selected="false"
          tabIndex={-1}
          className="Tab"
        >
          Delivery &amp; Returns
        </button>
      </div>

      {/* Tab panels */}
      <div
        id="content-tab-panel-0"
        role="tabpanel"
        aria-labelledby="content-tab-0"
      >
        <div className="EditorAdvice">
          <p>
            MAC Cosmetics Hug Me Lustreglass Lipstick is a warm-toned nude shade
            with a lustrous, glossy finish. Perfect for everyday wear, this
            lipstick enhances your natural lip color while keeping lips hydrated
            and comfortable. Pair with minimal makeup for a fresh look, or layer
            with a smoky eye for balance. It&apos;s a versatile addition to your
            collection.
          </p>
        </div>
      </div>

      <div
        id="content-tab-panel-1"
        role="tabpanel"
        aria-labelledby="content-tab-1"
        hidden
      >
        <div className="KeyDetails">
          <ul>
            <li>
              <strong>Shade:</strong> Hug Me
            </li>
            <li>
              <strong>Finish:</strong> Lustreglass – glossy, sheer coverage
            </li>
            <li>
              <strong>Weight:</strong> 3g
            </li>
            <li>
              <strong>Benefits:</strong> Lightweight, hydrating, everyday wear
            </li>
          </ul>
        </div>
      </div>

      <div
        id="content-tab-panel-2"
        role="tabpanel"
        aria-labelledby="content-tab-2"
        hidden
      >
        <div className="Ingredients">
          <p>
            Ingredients: Ricinus Communis (Castor) Seed Oil, Octyldodecanol,
            Euphorbia Cerifera (Candelilla) Wax, Cera Alba (Beeswax), etc.
          </p>
        </div>
      </div>

      <div
        id="content-tab-panel-3"
        role="tabpanel"
        aria-labelledby="content-tab-3"
        hidden
      >
        <div className="DeliveryReturns">
          <p>
            Enjoy free delivery within 2 hours in Dubai, Abu Dhabi and Sharjah.
            Returns are accepted within 30 days. Conditions apply.
          </p>
        </div>
      </div>
    </>
  );
}
