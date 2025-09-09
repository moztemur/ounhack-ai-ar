export default function AmberPoints() {
  return (
    <div className="PDPDesktop-earnAmberPoints">
      <svg className="Icon Amber">
        <use href="/static/sprite.svg#Amber"></use>
      </svg>
      <span className="PDPDesktop-earnAmberPointsText">
        Earn <strong>119 Amber</strong> Points
      </span>
      <div id="earn-amber-points-tooltip" className="Tooltip undefined">
        <button
          aria-label="How to earn amber points?"
          type="button"
          id="earn-amber-points-tooltip-trigger"
          aria-describedby="earn-amber-points-tooltip-content"
          aria-expanded="false"
          className="Tooltip-trigger"
        >
          <svg className="Icon MoreInfo">
            <use href="/static/sprite.svg#MoreInfo"></use>
          </svg>
        </button>
        <div
          id="earn-amber-points-tooltip-content"
          role="tooltip"
          style={{ display: "none" }}
          className="Tooltip-content"
        >
          • Log in to your Amber account at checkout <br />• Earn points every
          time you shop
        </div>
      </div>
      <svg className="Icon Tag">
        <use href="/static/sprite.svg#Tag"></use>
      </svg>
      <span className="PDPDesktop-priceMatchText">
        We offer <strong>Price Match</strong>
      </span>
      <button
        type="button"
        aria-label="Learn more about our price match policy"
        className="PDPDesktop-priceMatchLearnMoreButton"
      >
        Learn more
      </button>
    </div>
  );
}
