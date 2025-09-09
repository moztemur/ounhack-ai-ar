export default function BNPL() {
  return (
    <div className="BNPL">
      <div className="BNPL-title">Interest-free instalments available.</div>
      <div className="BNPL-options">
        <button type="button">
          <img
            alt="tabby"
            src="https://www.ounass.ae/static/images/bnpl/tabby.png"
            height="12"
          />
          <svg className="Icon MoreInfoExclamation">
            <use href="/static/sprite.svg#MoreInfoExclamation"></use>
          </svg>
        </button>
        <button type="button">
          <img
            alt="tamara"
            src="https://www.ounass.ae/static/images/bnpl/tamara.png"
            height="12"
          />
          <svg className="Icon MoreInfoExclamation">
            <use href="/static/sprite.svg#MoreInfoExclamation"></use>
          </svg>
        </button>
      </div>
    </div>
  );
}
