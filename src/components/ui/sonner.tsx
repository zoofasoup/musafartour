import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import "@/styles/pkg-v2.css";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        // pkg-v2 look: ink glass pill, soft type (see .pkg-toast in pkg-v2.css)
        className: "pkg-v2 pkg-toast",
        classNames: {
          description: "pkg-toast-desc",
          actionButton: "pkg-toast-btn",
          cancelButton: "pkg-toast-btn",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
