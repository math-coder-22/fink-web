export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md rounded-3xl border p-8 bg-white">
        <h1 className="text-3xl font-bold">Lupa Password</h1>

        <form className="mt-6 flex flex-col gap-4">
          <input
            type="email"
            placeholder="Masukkan email"
            className="rounded-xl border p-3"
          />

          <button className="rounded-xl bg-green-800 text-white p-3">
            Kirim Link Reset
          </button>
        </form>
      </div>
    </main>
  )
}
