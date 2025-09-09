export default function ValuePropositionWrapper() {
  return (
    <ul className="ValuePropositionWrapper">
      <li>
        <div
          style={{ backgroundColor: "#000", color: "#fff" }}
          className="ValueProposition"
        >
          <div className="LazyImage">
            <div style={{ paddingBottom: "100%" }}>
              <img
                alt="no_returns_desktop"
                src="//ounass-ae.atgcdn.ae/contentful/b3xlytuyfm3e/Lh9XDjbJ46HTM0t35U96t/8d62fffb15bd41ba385692265a6bb40e/nonreturnablewhite.png?q=70"
                width="32"
                height="32"
                loading="lazy"
              />
            </div>
          </div>
          <span className="ValueProposition-text">Non-Returnable Item</span>
        </div>
      </li>
    </ul>
  );
}
