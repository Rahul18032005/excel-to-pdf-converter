
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";

// Use the XLSX library globally available from index.html
declare const XLSX: any;

interface WebConverterProps {
  format: 'excel' | 'word';
  setFormat: (f: 'excel' | 'word') => void;
}

const WebConverter: React.FC<WebConverterProps> = ({ format, setFormat }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setDownloadReady(false);
      setError(null);
      setStatusMessage("");
      setResultBlob(null);
    }
  };

  const convertFile = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setDownloadReady(false);
    setStatusMessage("Ignition sequence started...");

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          setStatusMessage("Scanning document topography...");
          
          const prompt = format === 'excel' 
            ? "Extract all data from this PDF. Return ONLY a JSON array of objects where each object represents a row. If there are multiple tables, merge them into one list. Do not include markdown formatting or extra text."
            : "Convert this document to a structured text format suitable for professional use.";

          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{
              parts: [
                { inlineData: { mimeType: 'application/pdf', data: base64Data } },
                { text: prompt }
              ]
            }],
            config: {
              responseMimeType: "application/json"
            }
          });

          const rawText = response.text;
          
          if (format === 'excel') {
            setStatusMessage("Assembling spreadsheet modules...");
            const data = JSON.parse(rawText);
            
            // Create a new workbook and worksheet using SheetJS
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "ExtractedData");
            
            // Generate binary data
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            
            setResultBlob(blob);
            setDownloadReady(true);
          } else {
            // Handle Word/Text conversion simply for now
            const blob = new Blob([rawText], { type: 'application/msword' });
            setResultBlob(blob);
            setDownloadReady(true);
          }

          setLoading(false);
          setStatusMessage("System calibrated. Output ready.");
        } catch (innerErr) {
          console.error(innerErr);
          setError("Engine failure: Data extraction interrupted.");
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("System override failed. Connection lost.");
      setLoading(false);
    }
  };

  const downloadFile = () => {
    if (!resultBlob || !file) return;
    const url = window.URL.createObjectURL(resultBlob);
    const a = document.createElement('a');
    a.href = url;
    const extension = format === 'excel' ? 'xlsx' : 'doc';
    a.download = `${file.name.replace('.pdf', '')}_converted.${extension}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="bg-slate-900 rounded-[2rem] p-8 shadow-2xl border border-slate-800 flex flex-col gap-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-bold mb-2 text-white">Infotainment Console</h2>
          <p className="text-sm text-slate-500">Configure your data output parameters.</p>
        </div>
        
        <div className="flex gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button 
            onClick={() => setFormat('excel')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${format === 'excel' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'text-slate-500 hover:text-slate-300'}`}
          >
            EXCEL
          </button>
          <button 
            onClick={() => setFormat('word')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${format === 'word' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'text-slate-500 hover:text-slate-300'}`}
          >
            WORD
          </button>
        </div>
      </div>

      {!downloadReady ? (
        <div 
          className={`relative border-2 border-dashed rounded-[2rem] p-12 flex flex-col items-center justify-center transition-all min-h-[300px] ${file ? 'border-orange-500 bg-orange-500/5' : 'border-slate-800 hover:border-orange-500 bg-slate-950/50'}`}
        >
          <input type="file" accept=".pdf" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${file ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="text-lg font-semibold mb-1 text-white text-center">{file ? file.name : 'Ignition: Upload PDF'}</p>
          <p className="text-sm text-slate-500 text-center">Drag and drop or tap to browse your filesystem</p>
          
          {file && !loading && (
            <button onClick={convertFile} className="mt-8 bg-orange-500 text-white px-10 py-4 rounded-xl font-bold hover:scale-105 transition-all shadow-lg shadow-orange-500/20 uppercase tracking-widest text-sm">
              Engage Extraction
            </button>
          )}
        </div>
      ) : (
        <div className="border-2 border-orange-500 bg-orange-500/10 rounded-[2rem] p-12 flex flex-col items-center justify-center min-h-[300px] animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-orange-500 text-white rounded-full flex items-center justify-center mb-6 shadow-xl shadow-orange-500/40">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Extraction Complete</h3>
          <p className="text-slate-400 mb-8">Data has been successfully compiled into {format.toUpperCase()}.</p>
          <button 
            onClick={downloadFile} 
            className="bg-white text-slate-950 px-10 py-4 rounded-xl font-bold hover:bg-orange-500 hover:text-white transition-all shadow-xl flex items-center gap-3 group"
          >
            <svg className="w-5 h-5 group-hover:translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            DOWNLOAD OUTPUT
          </button>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center py-12 bg-slate-950/80 rounded-[2rem] absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm m-8">
          <div className="relative w-24 h-24 mb-6">
            <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-xl font-bold text-white mb-2">Processing Data</p>
          <p className="text-sm font-medium text-orange-500 animate-pulse uppercase tracking-widest">{statusMessage}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-400">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-xs font-bold hover:text-white">DISMISS</button>
        </div>
      )}
    </div>
  );
};

export default WebConverter;
