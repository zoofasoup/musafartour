import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CogsCalculator } from "@/components/admin/cogs/CogsCalculator";
import { Loader2 } from "lucide-react";

export default function MasterCOGS() {
  const [templateData, setTemplateData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const { data, error } = await supabase.from('cogs_defaults').select('data').eq('id', 'default').single();
        if (data) {
          setTemplateData(data.data);
        }
      } catch (err) {
        console.error("Error fetching template", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTemplate();
  }, []);

  if (isLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-2 md:p-6 pb-20">
      <div className="max-w-[1400px] mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6">
          <CogsCalculator 
            packageId="default" 
            initialData={templateData} 
            isTemplate={true} 
          />
        </div>
      </div>
    </div>
  );
}
