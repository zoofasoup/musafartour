/**
 * Translates Supabase Auth / network errors into Indonesian copy the user can act on.
 * One place so login, registration and password reset say the same thing.
 */
export function translateAuthError(error: unknown): string {
  const raw =
    typeof error === "string"
      ? error
      : (error as { message?: string } | null)?.message ?? "";
  const status = (error as { status?: number } | null)?.status;
  const code = (error as { code?: string } | null)?.code ?? "";
  const m = raw.toLowerCase();

  if (m.includes("invalid login credentials") || code === "invalid_credentials") {
    return "Email atau password salah. Periksa lagi, atau pakai \"Lupa password?\".";
  }
  if (m.includes("email not confirmed") || code === "email_not_confirmed") {
    return "Email belum dikonfirmasi. Cek kotak masuk atau folder spam Anda.";
  }
  if (m.includes("already registered") || m.includes("already been registered") || code === "user_already_exists") {
    return "Email ini sudah terdaftar. Silakan masuk, atau pakai \"Lupa password?\" jika Anda lupa passwordnya.";
  }
  if (
    status === 429 ||
    m.includes("rate limit") ||
    m.includes("too many requests") ||
    m.includes("for security purposes") ||
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit"
  ) {
    return "Terlalu banyak percobaan. Tunggu beberapa menit, lalu coba lagi.";
  }
  if (m.includes("password should be at least") || m.includes("weak password") || code === "weak_password") {
    return "Password terlalu lemah. Gunakan minimal 8 karakter dengan campuran huruf dan angka.";
  }
  if (m.includes("same password") || code === "same_password") {
    return "Password baru harus berbeda dari password sebelumnya.";
  }
  if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("network request failed") || m.includes("load failed")) {
    return "Tidak bisa terhubung ke server. Periksa koneksi internet Anda, lalu coba lagi.";
  }
  if (m.includes("signups not allowed") || code === "signup_disabled") {
    return "Pendaftaran sedang ditutup. Hubungi admin.";
  }
  if (m.includes("invalid email") || code === "email_address_invalid") {
    return "Format email tidak valid.";
  }
  return "Terjadi kesalahan. Silakan coba lagi.";
}
