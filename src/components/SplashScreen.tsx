function SplashScreen() {
  return (
    <div
      role="status"
      aria-label="Loading GardenMate"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3"
      style={{ backgroundColor: '#4a7c3f' }}
    >
      <span className="animate-bounce text-6xl" aria-hidden="true">
        🌿
      </span>
      <p className="animate-pulse text-xl font-semibold tracking-wide text-white">GardenMate</p>
    </div>
  );
}

export default SplashScreen;
