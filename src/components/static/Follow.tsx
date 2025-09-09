export default function Follow() {
  return (
    <div
      id="follow-the-designer-tooltip"
      className="Tooltip FollowTheDesignerTooltip"
    >
      <button
        type="button"
        id="follow-the-designer-tooltip-trigger"
        aria-describedby="follow-the-designer-tooltip-content"
        aria-expanded="false"
        className="ButtonV1 Tooltip-trigger tertiary"
      >
        <svg className="Icon Star">
          <use href="/static/sprite.svg#Star"></use>
        </svg>
        <span>Follow</span>
      </button>
      <div
        id="follow-the-designer-tooltip-content"
        role="tooltip"
        style={{ display: "none" }}
        className="Tooltip-content"
      >
        Follow this brand to get exciting updates
        <br />
        on new collections, offers and more.
      </div>
    </div>
  );
}
