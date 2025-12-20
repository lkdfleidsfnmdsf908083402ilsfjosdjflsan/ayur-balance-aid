import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useFinanceStore } from '@/store/financeStore';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export function UploadView() {
  const { uploadFile, uploadedFiles, removeFile, isLoading } = useFinanceStore();
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { toast } = useToast();
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      try {
        await uploadFile(file);
        setUploadStatus('success');
        toast({
          title: 'Datei hochgeladen',
          description: `${file.name} wurde erfolgreich importiert.`,
        });
      } catch (error) {
        setUploadStatus('error');
        toast({
          title: 'Fehler beim Import',
          description: error instanceof Error ? error.message : 'Unbekannter Fehler',
          variant: 'destructive',
        });
      }
    }
    
    setTimeout(() => setUploadStatus('idle'), 3000);
  }, [uploadFile, toast]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: true,
  });

  const months = ['', 'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="Datenimport" 
        description="CSV-Saldenlisten hochladen und verwalten" 
      />
      
      <div className="flex-1 overflow-auto p-6">
        {/* Upload Zone */}
        <div
          {...getRootProps()}
          className={cn(
            "glass-card rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-200",
            isDragActive && "border-primary bg-primary/5",
            uploadStatus === 'success' && "border-success bg-success/5",
            uploadStatus === 'error' && "border-destructive bg-destructive/5",
            !isDragActive && uploadStatus === 'idle' && "border-border hover:border-primary/50"
          )}
        >
          <input {...getInputProps()} />
          
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors",
            isDragActive && "bg-primary/10",
            uploadStatus === 'success' && "bg-success/10",
            uploadStatus === 'error' && "bg-destructive/10",
            !isDragActive && uploadStatus === 'idle' && "bg-muted"
          )}>
            {uploadStatus === 'success' ? (
              <Check className="h-8 w-8 text-success" />
            ) : uploadStatus === 'error' ? (
              <AlertCircle className="h-8 w-8 text-destructive" />
            ) : (
              <Upload className={cn(
                "h-8 w-8",
                isDragActive ? "text-primary" : "text-muted-foreground"
              )} />
            )}
          </div>
          
          {isDragActive ? (
            <p className="text-lg font-medium text-primary">Dateien hier ablegen...</p>
          ) : (
            <>
              <p className="text-lg font-medium text-foreground mb-2">
                Saldenlisten hochladen
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Ziehen Sie CSV-Dateien hierher oder klicken Sie zum Auswählen
              </p>
              <p className="text-xs text-muted-foreground">
                Erwartetes Format: <code className="bg-muted px-2 py-0.5 rounded">Saldenliste-MM-YYYY.csv</code>
              </p>
            </>
          )}
          
          {isLoading && (
            <div className="mt-4">
              <div className="w-32 h-1 bg-muted rounded-full mx-auto overflow-hidden">
                <div className="h-full bg-primary animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          )}
        </div>
        
        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">
              Hochgeladene Dateien ({uploadedFiles.length})
            </h3>
            
            <div className="space-y-2">
              {uploadedFiles
                .sort((a, b) => b.year * 100 + b.month - (a.year * 100 + a.month))
                .map((file) => (
                  <div 
                    key={file.name}
                    className="glass-card rounded-lg p-4 flex items-center justify-between animate-slide-in-right"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {months[file.month]} {file.year} • {file.data.length} Konten
                        </p>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(file.name)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
            </div>
          </div>
        )}
        
        {/* Instructions */}
        <div className="mt-8 glass-card rounded-xl p-6 border border-border">
          <h3 className="font-medium text-foreground mb-3">Hinweise zum Datenformat</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              CSV-Dateien mit Semikolon (;) oder Komma (,) als Trennzeichen
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              Erforderliche Spalten: Kontoklasse, KontoNr, Kontobezeichnung
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              Deutsche Zahlenformatierung (1.234,56) wird unterstützt
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              Jahr und Monat werden aus dem Dateinamen extrahiert
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
