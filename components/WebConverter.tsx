
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";

// Use the XLSX library globally available from index.html
declare const XLSX: any;

interface WebConverterProps {
  format: 'excel' | 'word';
  setFormat: (f: 'excel' | 'word') => void;
  onErrorUpdate?: (error: string | null) => void;
}

const WebConverter: React.FC<WebConverterProps> = ({ format, setFormat, onErrorUpdate }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);
  const [error, setError] = useState<{message: string, detail?: string} | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [telemetry, setTelemetry] = useState<string>("SYSTEM_IDLE");
  const [simProgress, setSimProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  
  const progressTimer = useRef<number>(null);
  const telemetryTimer = useRef<number>(null);

  const telemetryLabels = [
    "NEURAL_MAPPING_ACTIVE",
    "BUFFER_ALLOCATION_OPTIMIZED",
    "VECTOR_EXTRACTION_V4.2",
    "OCR_ENGINE_STANDBY",
    "PARSING_TABLE_HIERARCHY",
    "METADATA_STRIPPING_COMPLETE",
    "STREAM_VELOCITY_STABLE",
    "RECONSTRUCTING_CELL_DATA"
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setDownloadReady(false);
      setError(null);
      if (onErrorUpdate) onErrorUpdate(null);
      setStatusMessage("");
      setResultBlob(null);
      setSimProgress(0);
      
      startConversion(selectedFile);
    }
  };

  const cleanJsonResponse = (text: string) => {
    // Remove potential markdown code blocks
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```/, '').replace(/```$/, '');
    }
    return cleaned.trim();
  };

  const startConversion = async (selectedFile: File) => {
    setLoading(true);
    setError(null);
    if (onErrorUpdate) onErrorUpdate(null);
    setDownloadReady(false);
    setStatusMessage("UPLOADING_STREAM");
    
    let prog = 0;
    progressTimer.current = window.setInterval(() => {
      prog += prog < 40 ? 1.5 : (prog < 85 ? 0.3 : 0.05);
      setSimProgress(Math.min(prog, 98));
    }, 100);

    let telIdx = 0;
    telemetryTimer.current = window.setInterval(() => {
      setTelemetry(telemetryLabels[telIdx % telemetryLabels.length]);
      telIdx++;
    }, 1500);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          setStatusMessage("SCANNING_TOPOGRAPHY");
          
          const prompt = format === 'excel' 
            ? "Extract all table data from this PDF. Return ONLY a JSON array of objects. No text, no intro, no backticks. Each object represents a row. Merge all pages into one flat array."
            : "Convert this PDF to a clean, professionally formatted text document. Preserve lists and headers.";

          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{
              parts: [
                { inlineData: { mimeType: 'application/pdf', data: base64Data } },
                { text: prompt }
              ]
            }],
            config: {
              responseMimeType: format === 'excel' ? "application/json" : "text/plain",
              temperature: 0.1
            }
          });

          const rawText = response.text;
          if (!rawText) throw new Error("EMPTY_RESPONSE");

          let blob: Blob;
          setStatusMessage("ASSEMBLING_PAYLOAD");
          
          if (format === 'excel') {
            try {
              const cleanedText = cleanJsonResponse(rawText);
              const data = JSON.parse(cleanedText);
              if (!Array.isArray(data)) throw new Error("INVALID_DATA_STRUCTURE");

              const worksheet = XLSX.utils.json_to_sheet(data);
              const workbook = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(workbook, worksheet, "ExtractedData");
              const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
              blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            } catch (jsonErr: any) {
              throw new Error(`DATA_PARSING_ERROR: ${jsonErr.message}`);
            }
          } else {
            blob = new Blob([rawText], { type: 'application/msword' });
          }

          cleanupTimers();
          setSimProgress(100);
          setResultBlob(blob);
          setDownloadReady(true);
          setLoading(false);
          setStatusMessage("EXTRACTION_SUCCESS");
          
          triggerDownload(blob, selectedFile.name);
        } catch (innerErr: any) {
          console.error("Conversion Error:", innerErr);
          const errMsg = innerErr.message || "UNKNOWN_ERROR";
          setError({
            message: "ENGINE_CRITICAL_FAILURE",
            detail: errMsg
          });
          if (onErrorUpdate) onErrorUpdate(errMsg);
          cleanup();
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch (err: any) {
      setError({ message: "SYSTEM_OFFLINE", detail: err.message });
      if (onErrorUpdate) onErrorUpdate(err.message);
      cleanup();
    }
  };

  const cleanupTimers = () => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    if (telemetryTimer.current) clearInterval(telemetryTimer.current);
  };

  const cleanup = () => {
    cleanupTimers();
    setLoading(false);
  };

  const triggerDownload = (blob: Blob, originalName: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const extension = format === 'excel' ? 'xlsx' : 'doc';
    a.download = `${originalName.replace('.pdf', '')}_converted.${extension}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const resetTask = () => {
    setFile(null);
    setDownloadReady(false);
    setResultBlob(null);
    setStatusMessage("");
    setSimProgress(0);
    setTelemetry("SYSTEM_IDLE");
    setError(null);
    if (onErrorUpdate) onErrorUpdate(null);
  };

  return (
    <div className="bg-slate-900 rounded-[2rem] p-10 shadow-2xl border border-slate-800 flex flex-col gap-8 relative overflow-hidden min-h-[500px]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${loading ? 'bg-orange-500 animate-pulse' : error ? 'bg-red-500' : 'bg-green-500'}`}></div>
            <h2 className="text-xl font-bold text-white tracking-tight uppercase">Direct Core V4.2</h2>
          </div>
          <p className="text-xs text-slate-500 font-mono tracking-widest">{telemetry}</p>
        </div>
        
        <div className="flex gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button 
            disabled={loading}
            onClick={() => setFormat('excel')}
            className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${format === 'excel' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            .XLSX
          </button>
          <button 
            disabled={loading}
            onClick={() => setFormat('word')}
            className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${format === 'word' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            .DOCX
          </button>
        </div>
      </div>

      {!loading && !downloadReady ? (
        <div className="relative border-2 border-dashed border-slate-800 hover:border-orange-500 hover:bg-slate-800/20 rounded-[2rem] p-16 flex flex-col items-center justify-center transition-all min-h-[350px] group">
          <input type="file" accept=".pdf" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
          <div className="w-20 h-20 rounded-3xl bg-slate-800 text-slate-400 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-orange-500 group-hover:text-white transition-all duration-500">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <p className="text-xl font-bold mb-2 text-white text-center">Load Target Document</p>
          <p className="text-sm text-slate-500 text-center font-mono uppercase tracking-tighter">Instant_Detection_Active</p>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-12 min-h-[350px] animate-in fade-in duration-500">
          <div className="relative w-48 h-48 mb-10">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-800" />
              <circle 
                cx="96" cy="96" r="80" 
                stroke="currentColor" strokeWidth="4" fill="transparent" 
                strokeDasharray={502} 
                strokeDashoffset={502 - (502 * simProgress) / 100}
                strokeLinecap="round"
                className="text-orange-500 transition-all duration-300 ease-out" 
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-white">{Math.round(simProgress)}%</span>
              <span className="text-[10px] text-orange-500 font-bold tracking-[0.2em]">EXTRACTING</span>
            </div>
          </div>
          <div className="w-full max-w-sm space-y-4">
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Process_Link_Active</span>
              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">{statusMessage}</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500" style={{width: `${simProgress}%`}}></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[350px] animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-green-500 text-white rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl shadow-green-500/20">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Target_Acquired</h3>
          <p className="text-slate-400 mb-10 text-center max-w-sm font-medium">Payload processed and dispatched to local storage.</p>
          <div className="flex gap-4">
            <button 
              onClick={() => resultBlob && file && triggerDownload(resultBlob, file.name)} 
              className="bg-white text-slate-950 px-8 py-4 rounded-2xl font-black hover:bg-orange-500 hover:text-white transition-all shadow-xl flex items-center gap-3"
            >
              RE-DOWNLOAD
            </button>
            <button 
              onClick={resetTask}
              className="bg-slate-800 text-white px-8 py-4 rounded-2xl font-black hover:bg-slate-700 transition-all border border-slate-700"
            >
              NEW_TASK
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-x-10 bottom-10 bg-slate-950 border border-red-500/50 rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 z-50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 text-red-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-grow">
              <h4 className="text-red-500 font-bold uppercase tracking-widest text-xs mb-1">Critical_System_Interrupt</h4>
              <p className="text-white font-medium mb-2">{error.message}</p>
              <div className="bg-slate-900 rounded-lg p-3 font-mono text-[10px] text-slate-500 break-all mb-4">
                LOG: {error.detail || "No additional trace available."}
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={resetTask} 
                  className="bg-red-500 text-white px-4 py-2 rounded-lg text-[10px] font-black hover:bg-red-600 transition-colors uppercase tracking-widest"
                >
                  Force_Reboot
                </button>
                <button 
                  onClick={() => setError(null)} 
                  className="text-slate-500 px-4 py-2 rounded-lg text-[10px] font-black hover:text-white transition-colors uppercase tracking-widest"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebConverter;
