export default function RedisOffline() {
  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold">We can’t reach the store database</h1>
      <p className="mt-3 text-sm text-neutral-600">
        This demo stores everything in Redis. Start Redis on <code className="bg-neutral-100 px-1">redis://127.0.0.1:6379</code> (for
        example <code className="bg-neutral-100 px-1">docker run -p 6379:6379 redis:7</code> or Memurai on Windows) and refresh the page.
      </p>
    </div>
  );
}
