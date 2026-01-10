import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Upload, Play, Pause, X, CheckCircle2, AlertCircle, Database } from "lucide-react";
import { supabase } from "@/lib/backend/client";
import { toast } from "sonner";

interface ParsedRow {
  part_no?: string;
  sku?: string;
  ic1_code?: string;
  ic1_code_desc?: string;
  ic2_code?: string;
  ic2_code_desc?: string;
  comp_part_no?: string;
  oem_no?: string;
  barcode?: string;
  usage_type?: string;
}

export const CSVChunkUploader = () => {
  const [file, setFile] = useState<File | null>(null);
  const [chunkSize, setChunkSize] = useState(1000);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [insertedRows, setInsertedRows] = useState(0);
  const [failedRows, setFailedRows] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pausedRef = useRef(false);

  const handleFileChange = (selectedFile: File | null) => {
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      resetProgress();
      toast.success(`File loaded: ${selectedFile.name}`);
    } else {
      toast.error("Please select a valid CSV file");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFileChange(droppedFile);
  };

  const resetProgress = () => {
    setProgress(0);
    setCurrentChunk(0);
    setTotalChunks(0);
    setTotalRows(0);
    setInsertedRows(0);
    setFailedRows(0);
    setErrors([]);
    setIsProcessing(false);
    setIsPaused(false);
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const mapRowToRecord = (values: string[], headers: string[]): ParsedRow => {
    const record: ParsedRow = {};
    
    const headerMap: { [key: string]: keyof ParsedRow } = {
      "Part No": "part_no",
      "SKU": "sku",
      "IC1 Code": "ic1_code",
      "IC1 Code and Desc": "ic1_code_desc",
      "IC2 Code": "ic2_code",
      "IC2 Code and Desc": "ic2_code_desc",
      "Comp Part No": "comp_part_no",
      "OEM No": "oem_no",
      "Barcode": "barcode",
      "Usage Type": "usage_type"
    };

    headers.forEach((header, index) => {
      const dbColumn = headerMap[header];
      if (dbColumn && values[index]) {
        record[dbColumn] = values[index];
      }
    });

    return record;
  };

  const processCSV = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    setIsProcessing(true);
    setIsPaused(false);
    pausedRef.current = false;
    setErrors([]);

    try {
      const text = await file.text();
      const lines = text.split("\n").filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error("CSV file must have headers and at least one row");
        setIsProcessing(false);
        return;
      }

      const headers = parseCSVLine(lines[0]);
      const dataRows = lines.slice(1);
      
      setTotalRows(dataRows.length);
      const chunks = Math.ceil(dataRows.length / chunkSize);
      setTotalChunks(chunks);

      let successCount = 0;
      let failureCount = 0;
      const errorLog: string[] = [];

      for (let i = 0; i < chunks; i++) {
        if (pausedRef.current) {
          toast.info("Upload paused");
          return;
        }

        setCurrentChunk(i + 1);
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, dataRows.length);
        const chunkData = dataRows.slice(start, end);

        const records = chunkData
          .map(row => parseCSVLine(row))
          .map(values => mapRowToRecord(values, headers))
          .filter(record => Object.keys(record).length > 0);

        const { error } = await supabase
          .from("oem_crossover")
          .insert(records);

        if (error) {
          failureCount += records.length;
          errorLog.push(`Chunk ${i + 1}: ${error.message}`);
        } else {
          successCount += records.length;
        }

        setInsertedRows(successCount);
        setFailedRows(failureCount);
        setProgress(Math.round(((i + 1) / chunks) * 100));
        setErrors(errorLog);
      }

      setIsProcessing(false);
      
      if (failureCount === 0) {
        toast.success(`Successfully imported ${successCount} rows!`);
      } else {
        toast.warning(`Imported ${successCount} rows with ${failureCount} failures`);
      }
    } catch (error) {
      console.error("CSV processing error:", error);
      toast.error("Failed to process CSV file");
      setIsProcessing(false);
    }
  };

  const handlePause = () => {
    setIsPaused(true);
    pausedRef.current = true;
  };

  const handleResume = () => {
    setIsPaused(false);
    pausedRef.current = false;
    processCSV();
  };

  const handleCancel = () => {
    pausedRef.current = true;
    setIsProcessing(false);
    setIsPaused(false);
    toast.info("Upload cancelled");
  };

  return (
    <div className="space-y-6">
      {/* File Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload OEM Crossover CSV
          </CardTitle>
          <CardDescription>
            Upload large CSV files in manageable chunks to populate the parts database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
          >
            <Database className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            {file ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFile(null)}
                  className="mt-2"
                >
                  Remove File
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-sm mb-2">Drag & drop CSV file here, or click to browse</p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Select CSV File
                </Button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              className="hidden"
            />
          </div>

          {/* Chunk Size Configuration */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Chunk Size: {chunkSize} rows</Label>
              <span className="text-xs text-muted-foreground">
                {file && totalRows > 0 
                  ? `≈ ${Math.ceil(totalRows / chunkSize)} chunks`
                  : "Adjust for optimal performance"}
              </span>
            </div>
            <Slider
              value={[chunkSize]}
              onValueChange={(values) => setChunkSize(values[0])}
              min={500}
              max={5000}
              step={100}
              disabled={isProcessing}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>500 rows (slower, safer)</span>
              <span>5000 rows (faster, risky)</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {!isProcessing && !isPaused && (
              <Button
                onClick={processCSV}
                disabled={!file}
                className="flex-1 gap-2"
              >
                <Play className="w-4 h-4" />
                Start Upload
              </Button>
            )}
            {isProcessing && !isPaused && (
              <>
                <Button
                  onClick={handlePause}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="destructive"
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
              </>
            )}
            {isPaused && (
              <>
                <Button
                  onClick={handleResume}
                  className="flex-1 gap-2"
                >
                  <Play className="w-4 h-4" />
                  Resume
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="destructive"
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progress Card */}
      {(isProcessing || progress > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {progress === 100 ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-blue-500" />
              )}
              Upload Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">
                  Chunk {currentChunk} of {totalChunks}
                </span>
                <span className="text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{totalRows}</p>
                <p className="text-xs text-muted-foreground">Total Rows</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-500/10">
                <p className="text-2xl font-bold text-green-600">{insertedRows}</p>
                <p className="text-xs text-muted-foreground">Inserted</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-500/10">
                <p className="text-2xl font-bold text-red-600">{failedRows}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex justify-center">
              {isProcessing && !isPaused && (
                <Badge variant="default" className="gap-2">
                  Processing...
                </Badge>
              )}
              {isPaused && (
                <Badge variant="secondary" className="gap-2">
                  Paused
                </Badge>
              )}
              {!isProcessing && progress === 100 && (
                <Badge variant="default" className="gap-2 bg-green-600">
                  <CheckCircle2 className="w-3 h-3" />
                  Complete
                </Badge>
              )}
            </div>

            {/* Error Log */}
            {errors.length > 0 && (
              <div className="border border-destructive/20 rounded-lg p-3 bg-destructive/5">
                <p className="text-sm font-medium mb-2 text-destructive">Errors:</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {errors.map((error, index) => (
                    <p key={index} className="text-xs text-muted-foreground">
                      {error}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
