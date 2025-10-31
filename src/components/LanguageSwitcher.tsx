import { Button } from "./ui/button";
import { useLanguage } from "@/hooks/useLanguage";

export const LanguageSwitcher = () => {
  const { language, toggleLanguage } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="font-semibold"
      aria-label="Switch language"
    >
      {language === 'id' ? 'EN' : 'ID'}
    </Button>
  );
};
