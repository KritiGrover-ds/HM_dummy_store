export default function RedisOffline() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="text-center text-2xl font-semibold">We can’t reach the store database</h1>
      <p className="mt-3 text-center text-sm text-neutral-600">
        This demo stores everything in Redis on <code className="bg-neutral-100 px-1">redis://127.0.0.1:6379</code>. Start Redis, then refresh.
      </p>
      <div className="mt-8 bg-[#faf9f8] p-5 text-sm">
        <p className="font-semibold">Redis inside WSL on Windows? Run this once in your WSL terminal:</p>
        <pre className="mt-2 overflow-x-auto bg-white p-3 text-xs">{`sudo sed -i 's/^bind .*/bind 0.0.0.0/' /etc/redis/redis.conf
sudo sed -i 's/^protected-mode yes/protected-mode no/' /etc/redis/redis.conf
sudo service redis-server restart`}</pre>
        <p className="mt-2 text-xs text-neutral-600">
          The app then finds WSL’s IP address by itself. Or set <code>REDIS_URL=redis://&lt;output of: wsl hostname -I&gt;:6379</code> in <code>.env.local</code>.
        </p>
      </div>
    </div>
  );
}
