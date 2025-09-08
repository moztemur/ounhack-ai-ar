export default function CameraThumnail(props: {
  available: boolean;
  isActive: boolean;
  onClick: (active: boolean) => void;
}) {
  const { available, isActive, onClick } = props;
  if (!available) {
    return null;
  }

  return (
    <button
      className={`thumb ${isActive ? "thumbActive" : ""}`}
      onClick={() => {
        onClick(!isActive)
      }}
      aria-label="Toggle camera preview"
      title={isActive ? "Hide camera" : "Show camera"}
    >
      <div className="camIcon" aria-hidden>
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3 7.5C3 6.11929 4.11929 5 5.5 5H12.5C13.8807 5 15 6.11929 15 7.5V16.5C15 17.8807 13.8807 19 12.5 19H5.5C4.11929 19 3 17.8807 3 16.5V7.5Z"
            fill="#9fb4ff"
          />
          <path
            d="M16 9.5L20.2 7.3C20.8667 6.96667 21.6667 7.45 21.6667 8.2V15.8C21.6667 16.55 20.8667 17.0333 20.2 16.7L16 14.5V9.5Z"
            fill="#9fb4ff"
          />
        </svg>
      </div>
    </button>
  );
}
