import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CS_NUMBERS, 
  getCSStats, 
  getRedirectLogs, 
  resetRotation, 
  clearLogs,
  getCurrentRotationIndex 
} from '@/lib/whatsappRotation';
import { RefreshCw, Trash2, MessageCircle, Users, Clock, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';

const ChatRotation = () => {
  const [stats, setStats] = useState<Record<number, number>>({});
  const [logs, setLogs] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const refreshData = () => {
    setStats(getCSStats());
    setLogs(getRedirectLogs().slice(0, 10));
    setCurrentIndex(getCurrentRotationIndex());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleResetRotation = () => {
    resetRotation();
    refreshData();
    toast.success('Rotasi berhasil direset ke CS #1');
  };

  const handleClearLogs = () => {
    clearLogs();
    refreshData();
    toast.success('Log redirect berhasil dihapus');
  };

  const totalRedirects = Object.values(stats).reduce((a, b) => a + b, 0);
  const nextCS = CS_NUMBERS[currentIndex];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">WhatsApp Rotation</h1>
          <p className="text-muted-foreground">
            Kelola distribusi chat WhatsApp ke customer service
          </p>
        </div>
        <Button variant="outline" onClick={refreshData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalRedirects}</p>
                <p className="text-sm text-muted-foreground">Total Redirect</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Users className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{CS_NUMBERS.length}</p>
                <p className="text-sm text-muted-foreground">Total CS</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <RotateCcw className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{nextCS?.name || 'CS #1'}</p>
                <p className="text-sm text-muted-foreground">Next in Queue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {logs[0] ? format(new Date(logs[0].timestamp), 'HH:mm') : '-'}
                </p>
                <p className="text-sm text-muted-foreground">Last Redirect</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CS Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Distribusi per CS</CardTitle>
          <CardDescription>Jumlah redirect ke masing-masing customer service</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {CS_NUMBERS.map((cs) => {
              const count = stats[cs.id] || 0;
              const percentage = totalRedirects > 0 ? (count / totalRedirects) * 100 : 0;
              
              return (
                <div key={cs.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{cs.name}</span>
                      <span className="text-sm text-muted-foreground">
                        +{cs.number}
                      </span>
                      {currentIndex === cs.id - 1 && (
                        <Badge variant="secondary" className="text-xs">
                          Next
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm font-medium">
                      {count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Redirects */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Redirect Terakhir</CardTitle>
            <CardDescription>10 redirect terakhir</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleResetRotation}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Rotasi
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearLogs}>
              <Trash2 className="w-4 h-4 mr-2" />
              Hapus Log
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Belum ada redirect tercatat
            </p>
          ) : (
            <div className="space-y-3">
              {logs.map((log, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{log.csName}</Badge>
                    {log.message && (
                      <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                        "{log.message}"
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(log.timestamp), "dd MMM, HH:mm:ss", { locale: localeId })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Cara Penggunaan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">URL Dasar:</p>
            <code className="text-sm text-primary">musafartour.com/chat</code>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">Dengan Custom Message:</p>
            <code className="text-sm text-primary">musafartour.com/chat?msg=Saya mau tanya paket Ramadhan</code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatRotation;
