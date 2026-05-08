export default function RegisterPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md rounded-3xl border p-8 bg-white">
        <h1 className="text-3xl font-bold">Daftar Akun Baru</h1>
        <p className="mt-2 text-gray-500">Smart Family Finance</p>

        <form className="mt-6 flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            className="rounded-xl border p-3"
          />

          <input
            type="password"
            placeholder="Password"
            className="rounded-xl border p-3"
          />

          <button className="rounded-xl bg-green-800 text-white p-3">
            Daftar
          </button>
        </form>
      </div>
    </main>
  )
}
