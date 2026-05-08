export default function LoginLinks() {
  return (
    <div className="mt-4 flex flex-col gap-2 text-center">
      <a
        href="/register"
        className="text-sm text-green-700 hover:underline"
      >
        Belum punya akun? Daftar
      </a>

      <a
        href="/forgot-password"
        className="text-sm text-gray-500 hover:underline"
      >
        Lupa password?
      </a>
    </div>
  )
}
