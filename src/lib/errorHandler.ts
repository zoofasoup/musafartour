/**
 * Maps database and system errors to user-friendly messages
 * Prevents information leakage through detailed error messages
 */
export function getSafeErrorMessage(error: any): string {
  // Handle common PostgreSQL error codes
  if (error.code === '23505') {
    return 'Item sudah ada. Silakan gunakan nilai yang berbeda.';
  }
  if (error.code === '23503') {
    return 'Referensi tidak valid. Silakan periksa kembali data Anda.';
  }
  if (error.code === '23502') {
    return 'Data yang diperlukan tidak lengkap.';
  }
  if (error.code === '42501') {
    return 'Anda tidak memiliki izin untuk melakukan tindakan ini.';
  }
  
  // Handle authentication errors
  if (error.message?.includes('Invalid login credentials')) {
    return 'Email atau password salah.';
  }
  if (error.message?.includes('Email not confirmed')) {
    return 'Silakan konfirmasi email Anda terlebih dahulu.';
  }
  if (error.message?.includes('User already registered')) {
    return 'Email sudah terdaftar.';
  }
  
  // Generic fallback message
  console.error('Detailed error:', error); // Log for debugging
  return 'Terjadi kesalahan. Silakan coba lagi.';
}
