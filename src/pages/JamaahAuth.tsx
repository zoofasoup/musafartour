import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useJamaahAuth } from "@/hooks/useJamaahAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const JamaahAuth = () => {
  const navigate = useNavigate();
  const { signUp, signIn } = useJamaahAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    const result =
      mode === "login" ? await signIn(email, password) : await signUp(email, password, fullName);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error || "Terjadi kesalahan");
      return;
    }

    if (mode === "register") {
      toast.success("Akun berhasil dibuat, silakan cek email untuk verifikasi");
      setMode("login");
      return;
    }

    navigate("/jamaah/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">
          {mode === "login" ? "Masuk" : "Daftar"} Akun Jamaah
        </h1>
        {mode === "register" && (
          <div className="space-y-1.5">
            <Label>Nama Lengkap</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Password</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar"}
        </Button>
        <button
          type="button"
          className="text-sm text-muted-foreground underline block mx-auto"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
        </button>
      </div>
    </div>
  );
};

export default JamaahAuth;
